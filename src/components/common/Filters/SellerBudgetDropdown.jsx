// File: Filters/SellerBudgetDropdown.jsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import Button from '@/components/atoms/Button';

export default function SellerBudgetDropdown({
  filterOptions = {},
  onBudgetChange,
  selectedPriceRange,
  customBudget,
  currencySymbol = '$', // تقدر تغيّرها لـ EGP مثلاً
}) {
  const BRAND = '#108A00';
  const RING = `${BRAND}66`;
  const rootRef = useRef(null);

  // ---- Helpers
  const fmtNumber = (n) => {
    if (n === '' || n === null || n === undefined) return '';
    const num = Number(n);
    if (Number.isNaN(num)) return '';
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
  };

  // حوّل مفاتيح priceRanges إلى تسميات لطيفة
  const labelForRange = (id) => {
    switch (id) {
      case 'u1000':
        return `Value Under ${currencySymbol}1,000`;
      case 'm1000_3600':
        return `Mid-range ${currencySymbol}1,000 - ${currencySymbol}3,600`;
      case 'h3600+':
        return `High-End ${currencySymbol}3,600 & Above`;
      default:
        return id;
    }
  };

  // ---- Options مشتقة من filterOptions.priceRanges (لو مش موجودة، ندي افتراضي)
  const tiers = useMemo(() => {
    const pr = filterOptions.priceRanges || {
      u1000: 0,
      m1000_3600: 0,
      'h3600+': 0,
    };
    return Object.entries(pr).map(([id, count]) => ({
      id,
      label: labelForRange(id),
      count: Number(count) || 0,
    })).concat([{ id: 'custom', label: 'Custom Budget', count: null }]);
  }, [filterOptions, currencySymbol]);

  // ---- State
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(selectedPriceRange || null);
  const [customValue, setCustomValue] = useState(customBudget || '');
  const [hasChanges, setHasChanges] = useState(false);

  // Sync props -> state
  useEffect(() => {
    setSelectedId(selectedPriceRange || null);
    setCustomValue(customBudget || '');
    setHasChanges(false);
  }, [selectedPriceRange, customBudget, open]);

  // detect changes
  useEffect(() => {
    if (!open) return;
    const changed =
      selectedId !== selectedPriceRange ||
      (selectedId === 'custom' && String(customValue || '') !== String(customBudget || ''));
    setHasChanges(changed);
  }, [selectedId, customValue, selectedPriceRange, customBudget, open]);

  // close on outside + Esc
  useEffect(() => {
    const onDoc = (e) => {
      if (!open) return;
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (!open) return;
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Enter') applyChanges();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, selectedId, customValue]);

  // lock scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => (document.body.style.overflow = prev);
  }, [open]);

  // ---- Derived label
  const activeLabel = () => {
    if (selectedId === 'custom' && customValue) return `Budget: ${currencySymbol}${fmtNumber(customValue)}`;
    const t = tiers.find((t) => t.id === selectedId);
    return t ? t.label : 'Budget';
  };

  // ---- Handlers
  const clearAll = () => {
    setSelectedId(null);
    setCustomValue('');
    setHasChanges(true);
  };

  const onPick = (id) => {
    setSelectedId(id);
    setHasChanges(true);
  };

  const onCustomInput = (e) => {
    const v = e.target.value.replace(/[^\d]/g, ''); // أرقام فقط
    setCustomValue(v);
    setHasChanges(true);
  };

  const applyChanges = () => {
    if (selectedId === 'custom') {
      if (!customValue || Number(customValue) <= 0 || Number.isNaN(Number(customValue))) {
        onBudgetChange?.(null, '');
      } else {
        onBudgetChange?.('custom', customValue);
      }
    } else {
      onBudgetChange?.(selectedId, '');
    }
    setOpen(false);
  };

  const RadioRow = ({ id, label, count }) => {
    const active = selectedId === id;
    const disabled = count === 0 && id !== 'custom'; // عطّل اللي عدّه صفر (ماعدا custom)
    return (
      <button
        type="button"
        onClick={() => !disabled && onPick(id)}
        disabled={disabled}
        className={`w-full px-3 py-2.5 mx-1 rounded-md flex items-center justify-between text-left transition
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${active ? 'bg-emerald-600 text-white' : 'hover:bg-emerald-50 text-slate-800'}`}
      >
        <span className="flex items-center gap-3">
          <span
            className={`w-5 h-5 rounded-full border flex items-center justify-center
              ${active ? 'border-transparent bg-white/20' : 'border-[#108A0013] bg-[#108A0033]'}`}
          >
            {active && <Check className="w-3 h-3 text-white" />}
          </span>
          <span className={`text-sm ${active ? 'font-medium' : 'font-normal'}`}>{label}</span>
        </span>
        {count !== null && (
          <span className={`text-[11px] ${active ? 'text-emerald-50' : 'text-slate-400'}`}>{count}</span>
        )}
      </button>
    );
  };

  // ---- Render
  return (
    <>
      {/* overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-[1px] animate-fadeIn"
          onClick={() => setOpen(false)}
        />
      )}

      <div ref={rootRef} className={`relative inline-block text-left ${open && 'z-[70]'}`}>
        {/* Trigger */}
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={`h-[40px] px-4 rounded-md border w-full bg-white flex items-center justify-between text-sm shadow-inner transition
            ${open ? 'ring-2' : ''}`}
          style={{ borderColor: open ? BRAND : '#cbd5e1', boxShadow: open ? `0 0 0 3px ${RING}` : undefined }}
        >
          <span className="truncate">{activeLabel()}</span>
          <ChevronDown
            className={`w-4 h-4 ml-2 transition-transform ${open ? 'rotate-180' : ''}`}
            style={{ color: open ? BRAND : '#94a3b8' }}
          />
        </button>

        {/* Panel */}
        <div
          className={`absolute left-0 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-[0_6px_24px_rgba(0,0,0,.08)]
            transition origin-top z-[70]
            ${open ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}
        >
          <div className="py-4">
            <div className="px-4">
              <h4 className="text-lg font-bold text-slate-900 mb-2">Budget</h4>
            </div>

            <div className="px-4 space-y-2">
              {tiers.map((t) => (
                <RadioRow key={t.id} id={t.id} label={t.label} count={t.count} />
              ))}

              {/* Custom input */}
              <div
                className={`overflow-hidden transition-[max-height,opacity,margin] duration-200 ease-out
                  ${selectedId === 'custom' ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}
              >
                <div className="h-[44px] rounded-md flex items-center px-4 text-sm" style={{ border: `2px solid ${BRAND}` }}>
                  <span className="text-slate-400 mr-2">{currencySymbol}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customValue}
                    onChange={onCustomInput}
                    className="w-full outline-none text-slate-900 placeholder:text-slate-400 bg-transparent"
                    placeholder="Enter amount"
                  />
                </div>

                <div className="mt-2 text-[11px] text-slate-400">
                  {customValue ? `You entered: ${currencySymbol}${fmtNumber(customValue)}` : 'Type a number only'}
                </div>

                <div className="mt-3 border-t border-slate-200" />
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 mt-2 -mb-2 flex items-center justify-between">
              <Button name="Clear All" color="outline" className="!w-fit !h-[35px]" onClick={clearAll} />
              {hasChanges && (
                <Button name="Apply" color="default" className="!w-fit !h-[35px]" onClick={applyChanges} />
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 120ms ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}
