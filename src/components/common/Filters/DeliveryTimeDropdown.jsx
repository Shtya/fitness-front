// File: Filters/DeliveryTimeDropdown.jsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, TimerIcon } from 'lucide-react';
import Button from '@/components/atoms/Button';

export default function DeliveryTimeDropdown({ onDeliveryTimeChange, selectedDeliveryTime, customDeliveryTime }) {
  const BRAND = '#108A00';
  const RING = `${BRAND}66`;
  const tiers = [
    { id: 'u1000', label: 'Express 24 hrs' },
    { id: 'm1000_3600', label: 'Upto 3 Days' },
    { id: 'h3600+', label: 'Upto 7 Days' },
    { id: 'custom', label: 'Custom Delivery' },
  ];

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(selectedDeliveryTime || null);
  const [customValue, setCustomValue] = useState(customDeliveryTime || '');
  const [hasChanges, setHasChanges] = useState(false);
  const rootRef = useRef(null);

  // Sync with props
  useEffect(() => {
    setSelectedId(selectedDeliveryTime || null);
    setCustomValue(customDeliveryTime || '');
    setHasChanges(false);
  }, [selectedDeliveryTime, customDeliveryTime, open]);

  // Check for changes
  useEffect(() => {
    if (open) {
      const isChanged = selectedId !== selectedDeliveryTime || (selectedId === 'custom' && customValue !== customDeliveryTime);
      setHasChanges(isChanged);
    }
  }, [selectedId, customValue, selectedDeliveryTime, customDeliveryTime, open]);

  // close on outside click
  useEffect(() => {
    const onDoc = e => {
      if (!open) return;
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // lock scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => (document.body.style.overflow = prev);
  }, [open]);

  const activeLabel = () => {
    if (selectedDeliveryTime === 'custom' && customDeliveryTime) return `Delivery: ${customDeliveryTime} days`;
    const t = tiers.find(t => t.id === selectedDeliveryTime);
    return t ? t.label : 'Delivery Time';
  };

  const clearAll = () => {
    setSelectedId(null);
    setCustomValue('');
    setHasChanges(true);
  };

  const onPick = id => {
    setSelectedId(id);
    setHasChanges(true);
  };

  const onCustomInput = e => {
    const v = e.target.value.replace(/[^\d]/g, '');
    setCustomValue(v);
    setHasChanges(true);
  };

  const applyChanges = () => {
    if (selectedId === 'custom' && !customValue) {
      // If custom is selected but no value entered, clear the selection
      onDeliveryTimeChange(null, '');
    } else {
      onDeliveryTimeChange(selectedId, selectedId === 'custom' ? customValue : '');
    }
    setOpen(false);
  };

  const RadioRow = ({ id, label }) => {
    const active = selectedId === id;
    return (
      <button
        type='button'
        onClick={() => onPick(id)}
        className={`w-full px-3 py-2.5 mx-1 rounded-md flex items-center justify-between text-left transition
          cursor-pointer ${active ? 'bg-emerald-600 text-white' : 'hover:bg-emerald-50 text-slate-800'}`}>
        <span className='flex items-center gap-3'>
          <span
            className={`w-5 h-5 rounded-full border flex items-center justify-center
              ${active ? 'border-transparent bg-white/20' : 'border-[#108A0013] bg-[#108A0033]'}`}>
            {active && <Check className='w-3 h-3 text-white' />}
          </span>
          <span className={`text-sm ${active ? 'font-medium' : 'font-normal'}`}>{label}</span>
        </span>
      </button>
    );
  };

  return (
    <>
      {/* overlay */}
      {open && <div className='fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-[1px] animate-fadeIn' onClick={() => setOpen(false)} />}

      <div ref={rootRef} className={`relative inline-block text-left ${open && 'z-[70]'}`}>
        {/* Trigger */}
        <button
          type='button'
          onClick={() => setOpen(o => !o)}
          className={`h-[40px] px-4 rounded-md border w-full bg-white flex items-center justify-between text-sm shadow-inner transition
            ${open ? 'ring-2' : ''}`}
          style={{ borderColor: open ? BRAND : '#cbd5e1', boxShadow: open ? `0 0 0 3px ${RING}` : undefined }}>
          <span className='truncate'>{activeLabel()}</span>
          <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: open ? BRAND : '#94a3b8' }} />
        </button>

        {/* Panel */}
        <div
          className={`absolute left-0 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-[0_6px_24px_rgba(0,0,0,.08)]
            transition origin-top z-[70]
            ${open ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
          <div className='py-4'>
            <div className='px-4'>
              <h4 className='text-lg font-bold text-slate-900 mb-2'>Delivery Time</h4>
            </div>

            <div className='px-4 space-y-2'>
              {tiers.map(t => (
                <RadioRow key={t.id} id={t.id} label={t.label} />
              ))}

              {/* Custom input */}
              <div
                className={`overflow-hidden transition-[max-height,opacity,margin] duration-200 ease-out
                  ${selectedId === 'custom' ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}>
                <div className='h-[44px] rounded-md flex items-center px-2 text-sm' style={{ border: `2px solid ${BRAND}` }}>
                  <span className='text-slate-400 rtl:ml-2 ltr:mr-2'>
                    {' '}
                    <TimerIcon />{' '}
                  </span>
                  <input type='text' inputMode='numeric' placeholder='Enter delivery time in days' value={customValue} onChange={onCustomInput} className='w-full outline-none text-slate-900 placeholder:text-slate-400 bg-transparent' />
                </div>

                <div className='mt-3 border-t border-slate-200' />
              </div>
            </div>

            {/* Footer */}
            <div className='px-4 mt-2 -mb-2 flex items-center justify-between'>
              <Button name='Clear All' color='outline' className='!w-fit !h-[35px] ' onClick={clearAll} />
              {hasChanges && <Button name='Apply' color='default' className='!w-fit !h-[35px]' onClick={applyChanges} />}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 120ms ease-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
