import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Input from './Input';

function pad(n) {
  return String(n).padStart(2, '0');
}

const hhmmRegex = /^$|^([01]\d|2[0-3]):([0-5]\d)$/; // "" or HH:MM

export function TimeField({ label = 'Time (HH:MM)', name, value, onChange, className = '', error }) {
  const [open, setOpen] = useState(false);
  const [tempH, setTempH] = useState('08');
  const [tempM, setTempM] = useState('00');
  const rootRef = useRef(null);

  useEffect(() => {
    const v = (value || '').trim();
    const ok = hhmmRegex.test(v);
    if (ok && v) {
      const [h, m] = v.split(':');
      setTempH(pad(Number(h)));
      setTempM(pad(Number(m)));
    }
  }, [value]);

  useEffect(() => {
    const onDoc = e => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const commit = (h = tempH, m = tempM) => {
    const val = `${pad(Number(h))}:${pad(Number(m))}`;
    onChange?.(val);
    setOpen(false);
  };

  const onManual = v => {
    onChange?.(v);
  };

  const hours = Array.from({ length: 24 }, (_, i) => pad(i));
  const minutes = Array.from({ length: 12 }, (_, i) => pad(i * 5)); // 00,05,10,...

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <Input label={label} name={name || 'time'} value={value || ''} onChange={onManual} placeholder=' ' className='cursor-pointer' onFocus={() => setOpen(true)} onClick={() => setOpen(true)} error={error} />

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className='absolute z-50 mt-1 w-[340px] rounded-lg border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-sm'>
            <div className='text-[12px] mb-2 text-slate-500'>Choose hour & minutes</div>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <div className='text-xs mb-1 text-slate-600'>Hour</div>
                <div className='grid grid-cols-6 gap-1 max-h-36 overflow-auto pr-1'>
                  {hours.map(h => (
                    <button
                      key={h}
                      type='button'
                      onClick={() => {
                        setTempH(h);
                        commit(h, tempM);
                      }}
                      className={['h-[25px] rounded-lg border text-xs', h === tempH ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50 text-slate-700'].join(' ')}>
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className='text-xs mb-1 text-slate-600'>Minutes</div>
                <div className='grid grid-cols-6 gap-1 max-h-36 overflow-auto pr-1'>
                  {minutes.map(m => (
                    <button
                      key={m}
                      type='button'
                      onClick={() => {
                        setTempM(m);
                        commit(tempH, m);
                      }}
                      className={['h-[25px] rounded-lg border text-xs', m === tempM ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50 text-slate-700'].join(' ')}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className='mt-3 flex items-center justify-between text-xs text-slate-500'>
              <div>
                Selected: <span className='font-medium text-slate-700'>{value && hhmmRegex.test(value) ? value : `${tempH}:${tempM}`}</span>
              </div>
              <button type='button' onClick={() => setOpen(false)} className='rounded-md border px-2.5 py-1 hover:bg-slate-50'>
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
