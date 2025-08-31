// File: Filters/SellerDetailsDropdown.jsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import Button from '@/components/atoms/Button';

export default function SellerDetailsDropdown({ filterOptions = {}, onFilterChange, selectedValues }) {
  const BRAND = '#108A00';
  const rootRef = useRef(null);

  // -------- Utils
  const arraysEqual = (a, b) => {
    const A = [...new Set(a)].sort();
    const B = [...new Set(b)].sort();
    if (A.length !== B.length) return false;
    return A.every((v, i) => v === B[i]);
  };

  const getCountryLabel = code => {
    try {
      // يعتمد على بيئة المتصفح
      const dn = new Intl.DisplayNames(['en'], { type: 'region' });
      return dn.of(code?.toUpperCase()) || code;
    } catch {
      return code;
    }
  };

  const makeOptionsFromObject = (obj = {}, { mapId = k => k, mapLabel = k => k } = {}) =>
    Object.entries(obj).map(([k, count]) => ({
      id: mapId(k),
      label: mapLabel(k),
      count: Number(count) || 0,
    }));

  // -------- Options (مُشتقة من filterOptions)
  const levelOptions = useMemo(() => {
    const raw = filterOptions.sellerLevels || {};
    const prettyMap = {
      lvl1: 'Level 1',
      lvl2: 'Level 2',
      lvl3: 'Level 3',
      top: 'Top Seller',
      new: 'New Seller',
    };
    return makeOptionsFromObject(raw, {
      mapLabel: k => prettyMap[k] || k,
    });
  }, [filterOptions]);

  const speaksOptions = useMemo(() => {
    // المفاتيح هي أسماء لغات جاهزة أصلاً
    const raw = filterOptions.sellerLanguages || {};
    return makeOptionsFromObject(raw, { mapLabel: k => k });
  }, [filterOptions]);

  const countryOptions = useMemo(() => {
    const raw = filterOptions.sellerCountries || {};
    return makeOptionsFromObject(raw, {
      mapId: k => k.toUpperCase(),
      mapLabel: k => getCountryLabel(k),
    });
  }, [filterOptions]);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState({
    level: new Set(selectedValues?.sellerLevel || []),
    availability: new Set(selectedValues?.sellerAvailability || []), // احتفظنا بيها تحسّبًا
    speaks: new Set(selectedValues?.sellerSpeaks || []),
    countries: new Set(selectedValues?.sellerCountries || []),
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSelected({
      level: new Set(selectedValues?.sellerLevel || []),
      availability: new Set(selectedValues?.sellerAvailability || []),
      speaks: new Set(selectedValues?.sellerSpeaks || []),
      countries: new Set(selectedValues?.sellerCountries || []),
    });
  }, [selectedValues]);

  // مقارنة التغييرات عند فتح المينيو
  useEffect(() => {
    if (!open) return;
    const changed = !arraysEqual([...selected.level], selectedValues?.sellerLevel || []) || !arraysEqual([...selected.availability], selectedValues?.sellerAvailability || []) || !arraysEqual([...selected.speaks], selectedValues?.sellerSpeaks || []) || !arraysEqual([...selected.countries], selectedValues?.sellerCountries || []);
    setHasChanges(changed);
  }, [selected, selectedValues, open]);

  // إغلاق عند كليك خارج
  useEffect(() => {
    const onDocClick = e => {
      if (!open) return;
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = e => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // -------- Handlers
  const toggleItem = (group, id) => {
    setSelected(prev => {
      const next = new Set(prev[group]);
      next.has(id) ? next.delete(id) : next.add(id);
      return { ...prev, [group]: next };
    });
  };

  const clearAll = () => {
    setSelected({
      level: new Set(),
      availability: new Set(),
      speaks: new Set(),
      countries: new Set(),
    });
    setHasChanges(true);
  };

  const applyChanges = () => {
    onFilterChange?.({
      sellerLevel: [...selected.level],
      sellerAvailability: [...selected.availability],
      sellerSpeaks: [...selected.speaks],
      sellerCountries: [...selected.countries],
    });
    setOpen(false);
  };

  const totalSelected = selected.level.size + selected.availability.size + selected.speaks.size + selected.countries.size;

  // -------- UI Subcomponents
  const OptionRow = ({ active, disabled, label, count, onClick }) => (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      className={`w-full px-2 py-1 mx-1 rounded-md flex items-center justify-between text-left transition
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${active ? 'bg-emerald-600 text-white' : 'hover:bg-emerald-50 text-slate-800'}`}>
      <span className='flex items-center gap-2'>
        <span
          className={`w-5 h-5 rounded-md border flex items-center justify-center
            ${active ? 'border-transparent bg-white/20' : 'border-[#108A0013] bg-[#108A0033]'}`}>
          {active && <Check className='w-3 h-3 text-white' />}
        </span>
        <div>
          <span className={`whitespace-nowrap truncate text-sm ${active ? 'font-medium' : 'font-normal'}`}>{label}</span>
          <span className={`mx-1 ${active ? 'text-emerald-50' : 'text-slate-400'} text-[10px]`}>{count}</span>
        </div>
      </span>
    </button>
  );

  const Section = ({ title, children, subtitle }) => (
    <div className='px-4'>
      <div className='flex items-baseline justify-between mb-2'>
        <h4 className='text-base font-bold text-slate-800'>{title}</h4>
        {subtitle && <span className='text-[10px] text-slate-400'>{subtitle}</span>}
      </div>
      <div className='grid grid-cols-2 gap-1'>{children}</div>
      <div className='my-2 border-t border-slate-200' />
    </div>
  );

  // -------- Render
  return (
    <>
      {open && <div className='fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-[1px] animate-fadeIn' onClick={() => setOpen(false)} />}

      <div ref={rootRef} className={`relative inline-block text-left ${open && 'z-[110]'}`}>
        {/* Trigger */}
        <button
          type='button'
          aria-haspopup='listbox'
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
          className={`h-[40px] px-4 rounded-md border w-full bg-white flex items-center justify-between text-sm shadow-inner transition ${open ? 'ring-2' : ''}`}
          style={{
            borderColor: open ? BRAND : '#cbd5e1',
            boxShadow: open ? `0 0 0 3px ${BRAND}66 inset` : undefined,
          }}>
          <span className='truncate'>{totalSelected > 0 ? `${totalSelected} filter${totalSelected > 1 ? 's' : ''} applied` : 'Filters'}</span>
          <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: open ? BRAND : '#94a3b8' }} />
        </button>

        {/* Panel */}
        <div
          className={`absolute left-0 mt-2 w-[350px] rounded-2xl border border-slate-200 bg-white shadow-[0_6px_24px_rgba(0,0,0,.08)] transition origin-top z-[70]
          ${open ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
          <div className='py-4 max-h-[70vh] overflow-auto'>
            {/* Seller level */}
            {levelOptions.length > 0 && (
              <Section title='Seller level' subtitle={`${levelOptions.reduce((a, b) => a + b.count, 0)} total`}>
                {levelOptions.map(o => (
                  <OptionRow key={o.id} label={o.label} count={o.count} disabled={o.count === 0} active={selected.level.has(o.id)} onClick={() => toggleItem('level', o.id)} />
                ))}
              </Section>
            )}

            {/* Speaks */}
            {speaksOptions.length > 0 && (
              <Section title='Seller Speaks' subtitle={`${speaksOptions.length} languages`}>
                {speaksOptions.map(o => (
                  <OptionRow key={o.id} label={o.label} count={o.count} disabled={o.count === 0} active={selected.speaks.has(o.id)} onClick={() => toggleItem('speaks', o.id)} />
                ))}
              </Section>
            )}

            {/* Countries */}
            {countryOptions.length > 0 && (
              <Section title='Seller Countries' subtitle={`${countryOptions.length} countries`}>
                {countryOptions.map(o => (
                  <OptionRow key={o.id} label={o.label} count={o.count} disabled={o.count === 0} active={selected.countries.has(o.id)} onClick={() => toggleItem('countries', o.id)} />
                ))}
              </Section>
            )}

            {/* Footer */}
            <div className='px-4 -mb-2 flex items-center justify-between gap-2'>
              <Button name='Clear All' color='outline' className='!w-fit !h-[35px]' onClick={clearAll} />
              {hasChanges && <Button name='Apply' color='default' className='!w-fit !h-[35px]' onClick={applyChanges} />}
            </div>
          </div>
        </div>
      </div>

      {/* tiny fade-in animation */}
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
