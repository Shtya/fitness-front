'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiUpload, FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { FaFileUpload } from 'react-icons/fa';
import api, { baseImg } from '@/utils/axios';
import { File, FileText, ImageIcon, Music, Video, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/app/[locale]/theme';

// ---- helpers --------------------------------------------------------------

const cx = (...cls) => cls.filter(Boolean).join(' ');

const safeJoin = (base, rel) => {
  const b = String(base || '').replace(/\/+$/, '');
  const r = String(rel || '').replace(/^\/+/, '');
  return r ? `${b}/${r}` : b;
};

export const getFileIcon = (mimeType, colors) => {
  if (mimeType?.startsWith('image')) return <ImageIcon className='w-12 h-12' style={{ color: colors.primary[500] }} />;
  if (mimeType?.startsWith('video')) return <Video className='w-12 h-12' style={{ color: colors.secondary[500] }} />;
  if (mimeType?.startsWith('audio')) return <Music className='w-12 h-12' style={{ color: colors.primary[400] }} />;
  if (mimeType === 'application/pdf' || mimeType === 'document') return <FileText className='w-12 h-12 text-rose-500' />;
  return <File className='w-12 h-12' style={{ color: colors.primary[300] }} />;
};

const BYTES_IN_KB = 1024;

// format size nicely
const formatSize = bytes => {
  if (!Number.isFinite(bytes)) return '';
  const v = bytes;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${Math.round(v / 1024)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
};

// small toast-ish inline message
const InlineNotice = ({ tone = 'info', children, colors }) => {
  const map = {
    info: { 
      bg: `${colors.primary[50]}80`, 
      text: colors.primary[700], 
      border: colors.primary[200] 
    },
    warn: { 
      bg: '#fef3c780', 
      text: '#92400e', 
      border: '#fcd34d' 
    },
    error: { 
      bg: '#fff1f280', 
      text: '#be123c', 
      border: '#fda4af' 
    },
  };
  const style = map[tone] || map.info;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className='flex items-center gap-2 text-sm border-2 rounded-lg px-4 py-3 shadow-sm'
      style={{ 
        backgroundColor: style.bg, 
        color: style.text, 
        borderColor: style.border 
      }}
    >
      <FiAlertCircle className='shrink-0' size={18} />
      <div className='min-w-0 font-medium'>{children}</div>
    </motion.div>
  );
};

// ---- component ------------------------------------------------------------

export default function AttachFilesButton({
  hiddenFiles,
  className = '',
  onChange,
  accept = undefined, // e.g. "image/*,application/pdf"
  maxFiles = 20,
  maxTotalBytes = 200 * 1024 * 1024, // 200 MB
  // optional: userId passed from outside
  userId,
}) {
  const t = useTranslations('attachments');
  const { colors } = useTheme();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [selected, setSelected] = useState([]); // [{id,...}]
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);

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
      const res = await api.get('/assets', {
        params: {
          userId: userId || undefined,
        },
      });
      const data = res?.data?.records || res?.data || [];
      setAttachments(Array.isArray(data) ? data : []);
    } catch (err) {
      setAttachments([]);
      setErrorMsg(t('errors.loadFiles'));
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
      setErrorMsg(t('errors.maxFiles', { count: maxFiles }));
      return;
    }
    if (totalBytes > maxTotalBytes) {
      setErrorMsg(t('errors.maxTotalBytes', { max: formatSize(maxTotalBytes) }));
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('category', 'general');

      const res = await api.post('/assets/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: {
          userId: userId || undefined, // send userId as query when available
        },
      });

      const newFiles = res?.data?.assets || res?.data || [];
      afterUploadMerge(Array.isArray(newFiles) ? newFiles : []);
    } catch (err) {
      console.error('Upload error', err);
      const backendMessage = err?.response?.data?.message;
      setErrorMsg(backendMessage || t('errors.uploadFiles'));
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
      setIsDragging(false);
      if (uploading) return;
      const files = Array.from(e.dataTransfer?.files || []);
      doUpload(files);
    };

    const onDragEnter = e => {
      stop(e);
      setIsDragging(true);
    };

    const onDragOver = stop;

    const onDragLeave = e => {
      stop(e);
      setIsDragging(false);
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

  const handleDeleteFile = (fileId, e) => {
    e?.stopPropagation?.();
    if (uploading) return;
    try {
      api.delete(`/assets/${fileId}`); // logic is backend-side
      setAttachments(prev => prev.filter(f => f.id !== fileId));
      setSelected(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      console.error('Delete error', err);
      const backendMessage = err?.response?.data?.message;
      setErrorMsg(backendMessage || t('errors.deleteFile'));
    }
  };

  // ---- modal view ---------------------------------------------------------

  const finishLabel = selected.length ? t('actions.finishSelectionWithCount', { count: selected.length }) : t('actions.finishSelection');

  const modalContent = (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className='fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4' 
        onClick={e => e.target === e.currentTarget && setIsModalOpen(false)} 
        role='dialog' 
        aria-modal='true' 
        aria-label={t('labels.attachFiles')}
      >
        <motion.div 
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          className='bg-white w-full max-w-[900px] rounded-lg shadow-2xl border-2 max-h-[90vh] overflow-hidden flex flex-col'
          style={{ borderColor: colors.primary[200] }}
        >
          {/* header */}
          <div 
            className='flex items-center justify-between gap-2 px-6 py-5 border-b-2'
            style={{ 
              background: `linear-gradient(135deg, ${colors.primary[50]}, white)`,
              borderColor: colors.primary[200] 
            }}
          >
            <div className='min-w-0'>
              <h3 className='text-xl font-bold' style={{ color: colors.primary[900] }}>
                {t('modal.title')}
              </h3>
              <p className='text-sm font-medium mt-1' style={{ color: colors.primary[600] }}>
                {t('modal.subtitle')}
              </p>
            </div>
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsModalOpen(false)} 
              className='inline-flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-all duration-200'
              style={{ 
                borderColor: colors.primary[200],
                color: colors.primary[600]
              }}
              aria-label={t('labels.close')}
            >
              <FiX className='w-5 h-5' />
            </motion.button>
          </div>

          {/* body */}
          <div className='flex-1 overflow-y-auto p-6 space-y-5'>
            <input ref={fileInputRef} type='file' className='hidden' multiple accept={accept} onChange={e => doUpload(Array.from(e.target.files || []))} />

            {/* Drag & Drop Zone */}
            <motion.div 
              ref={dropRef} 
              animate={{ 
                scale: isDragging ? 1.02 : 1,
                borderColor: isDragging ? colors.primary[500] : colors.primary[300]
              }}
              className='rounded-lg border-2 border-dashed p-8 transition-all duration-300'
              style={{ 
                backgroundColor: isDragging ? `${colors.primary[50]}40` : `${colors.primary[50]}20`,
                borderColor: isDragging ? colors.primary[500] : colors.primary[300]
              }}
            >
              <div className='flex flex-col items-center justify-center gap-4'>
                <div 
                  className='w-16 h-16 rounded-lg flex items-center justify-center shadow-lg'
                  style={{
                    background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`
                  }}
                >
                  <FiUpload className='w-8 h-8 text-white' />
                </div>
                <div className='text-center'>
                  <p className='text-lg font-semibold mb-1' style={{ color: colors.primary[900] }}>
                    {t('uploader.dragDrop') || 'Drag and drop files here'}
                  </p>
                  <p className='text-sm font-medium' style={{ color: colors.primary[500] }}>
                    {t('uploader.orClickToSelect') || 'or click the button below to select files'}
                  </p>
                </div>
                <motion.button 
                  type='button' 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={uploading || loading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className='px-6 py-3 rounded-lg font-semibold text-white shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                  style={{
                    background: `linear-gradient(to right, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`,
                    boxShadow: `0 4px 12px ${colors.primary[200]}`
                  }}
                >
                  <span className='flex items-center gap-2'>
                    <FiUpload className='w-5 h-5' />
                    {t('uploader.upload')}
                  </span>
                </motion.button>
              </div>
            </motion.div>

            {errorMsg ? <InlineNotice tone='error' colors={colors}>{errorMsg}</InlineNotice> : null}

            {/* Loading state */}
            {loading && (
              <div className='flex items-center justify-center py-12'>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className='w-12 h-12 border-4 border-t-transparent rounded-full'
                  style={{ borderColor: colors.primary[200], borderTopColor: 'transparent' }}
                />
              </div>
            )}

            {/* grid */}
            {!loading && (
              <motion.div 
                layout
                className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'
              >
                {/* files */}
                <AnimatePresence>
                  {attachments.map(asset => {
                    const selectedState = isSelected(asset.id);
                    const url = asset?.mimeType?.startsWith('image/') ? safeJoin(baseImg, asset.url) : null;

                    return (
                      <motion.div 
                        key={asset.id} 
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ y: -4 }}
                        onClick={() => handleFileSelectToggle(asset)} 
                        className='group relative rounded-lg border-2 p-3 bg-white transition-all duration-200 cursor-pointer'
                        style={{
                          borderColor: selectedState ? colors.primary[500] : colors.primary[200],
                          boxShadow: selectedState ? `0 4px 12px ${colors.primary[200]}` : '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                        tabIndex={0} 
                        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleFileSelectToggle(asset)}
                      >
                        {/* checkmark */}
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: selectedState ? 1 : 0 }}
                          className='absolute -top-2 -left-2 w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-lg z-10'
                          style={{
                            backgroundColor: colors.primary[600],
                            borderColor: 'white'
                          }}
                        >
                          <FiCheck className='w-5 h-5 text-white' strokeWidth={3} />
                        </motion.div>

                        {/* delete */}
                        <motion.button 
                          type='button' 
                          onClick={e => handleDeleteFile(asset.id, e)} 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className='absolute -top-2 -right-2 w-8 h-8 rounded-full border-2 bg-white text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none shadow-lg z-10'
                          style={{ borderColor: 'white' }}
                          aria-label={t('actions.deleteFile', { filename: asset.filename })} 
                          disabled={uploading}
                        >
                          <Trash2 className='w-4 h-4 mx-auto' />
                        </motion.button>

                        {/* preview */}
                        <div 
                          className='aspect-square rounded-lg overflow-hidden flex items-center justify-center'
                          style={{ backgroundColor: `${colors.primary[50]}60` }}
                        >
                          {url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={url} alt={asset.filename || t('labels.image')} loading='lazy' className='w-full h-full object-cover' />
                          ) : (
                            <div className='flex items-center justify-center w-full h-full'>{getFileIcon(asset.mimeType, colors)}</div>
                          )}
                        </div>

                        {/* meta */}
                        <div className='mt-3 space-y-1'>
                          <div className='truncate text-xs font-semibold' style={{ color: colors.primary[900] }} title={asset.filename}>
                            {asset.filename}
                          </div>
                          <div className='text-xs font-medium' style={{ color: colors.primary[500] }}>
                            {formatSize(asset.size)}
                          </div>
                        </div>

                        {/* Selected overlay */}
                        {selectedState && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className='absolute inset-0 rounded-lg pointer-events-none'
                            style={{
                              background: `linear-gradient(135deg, ${colors.primary[500]}10, ${colors.primary[600]}10)`
                            }}
                          />
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Empty state */}
            {!loading && attachments.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='text-center py-16'
              >
                <div 
                  className='w-20 h-20 mx-auto rounded-lg flex items-center justify-center mb-4'
                  style={{ backgroundColor: colors.primary[100] }}
                >
                  <FaFileUpload size={32} style={{ color: colors.primary[500] }} />
                </div>
                <p className='text-lg font-semibold' style={{ color: colors.primary[700] }}>
                  {t('labels.noFiles') || 'No files uploaded yet'}
                </p>
                <p className='text-sm font-medium mt-1' style={{ color: colors.primary[500] }}>
                  {t('labels.uploadFirst') || 'Upload your first file to get started'}
                </p>
              </motion.div>
            )}
          </div>

          {/* footer */}
          <div 
            className='px-6 py-4 border-t-2 flex items-center justify-between gap-3'
            style={{ 
              backgroundColor: colors.primary[50],
              borderColor: colors.primary[200]
            }}
          >
            <div className='text-sm font-semibold' style={{ color: colors.primary[700] }}>
              {t('labels.totalFiles')}: <span style={{ color: colors.primary[900] }}>{attachments.length}</span>
              {selected.length > 0 && (
                <span className='ml-3'>
                  {t('labels.selected') || 'Selected'}: <span style={{ color: colors.primary[900] }}>{selected.length}</span>
                </span>
              )}
            </div>

            <div className='flex items-center gap-3'>
              <motion.button 
                type='button' 
                onClick={() => setIsModalOpen(false)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className='inline-flex items-center justify-center h-11 px-6 rounded-lg border-2 font-semibold transition-all duration-200'
                style={{
                  borderColor: colors.primary[300],
                  backgroundColor: 'white',
                  color: colors.primary[700]
                }}
              >
                {t('actions.cancel')}
              </motion.button>

              <motion.button 
                type='button' 
                onClick={handleOkClick} 
                disabled={!selected.length}
                whileHover={{ scale: selected.length ? 1.05 : 1 }}
                whileTap={{ scale: selected.length ? 0.95 : 1 }}
                className='inline-flex items-center text-sm text-nowrap gap-2 h-11 px-6 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg'
                style={{
                  background: selected.length 
                    ? `linear-gradient(to right, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})` 
                    : colors.primary[300],
                  boxShadow: selected.length ? `0 4px 12px ${colors.primary[200]}` : 'none'
                }}
              >
                <FiCheck className='w-5 h-5' />
                {finishLabel}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // ---- main trigger -------------------------------------------------------

  return (
    <div className={cx('relative', className)}>
      <div className='flex flex-col items-start gap-4 my-6'>
        <motion.button 
          type='button' 
          onClick={toggleModal}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className='flex-none px-6 py-3 inline-flex items-center gap-3 rounded-lg border-2 font-semibold shadow-lg transition-all duration-200'
          style={{
            borderColor: colors.primary[500],
            color: colors.primary[700],
            backgroundColor: `${colors.primary[50]}80`
          }}
        >
          <FaFileUpload size={20} />
          <span>{t('labels.attachFiles')}</span>
        </motion.button>

        {!hiddenFiles && selected.length > 0 && (
          <motion.ul 
            layout
            className='flex flex-wrap items-center gap-2 w-full'
          >
            <AnimatePresence>
              {selected.map(file => (
                <motion.li 
                  key={file.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className='flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shadow-sm border-2'
                  style={{
                    backgroundColor: colors.primary[100],
                    borderColor: colors.primary[300],
                    color: colors.primary[900]
                  }}
                >
                  <span className='truncate max-w-[160px]' title={file.filename}>
                    {file.filename}
                  </span>
                  <motion.button 
                    type='button' 
                    onClick={() => setSelected(prev => prev.filter(f => f.id !== file.id))}
                    whileHover={{ scale: 1.2, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className='text-rose-500 hover:text-rose-600 focus:outline-none rounded-full'
                    aria-label={t('actions.removeFile', { filename: file.filename })}
                  >
                    <FiX className='w-4 h-4' strokeWidth={3} />
                  </motion.button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>

      {isModalOpen && createPortal(modalContent, document.body)}
    </div>
  );
}