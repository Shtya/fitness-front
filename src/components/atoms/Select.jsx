'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Check, X } from 'lucide-react';

export default function Select({
  options = [], // [{ id: '1', label: 'Option 1' }, ...]
  value = null, // selected id
  onChange = () => {},
  placeholder = 'Select…',
  label, // optional top label
  disabled = false,
  error, // optional error text
  className = '',
  searchable = true, // show search box
  clearable = true, // show X to clear
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);

  const selected = useMemo(() => options.find(o => o.id === value) || null, [options, value]);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(o => String(o.label).toLowerCase().includes(q));
  }, [options, query, searchable]);

  // Close when clicking outside
  useEffect(() => {
    function onDocClick(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Manage focus index each time list opens / filters change
  useEffect(() => {
    if (open) {
      // Try to focus selected item, else first item
      const ix = Math.max(
        0,
        filtered.findIndex(o => o.id === value),
      );
      setActiveIndex(filtered.length ? (ix === -1 ? 0 : ix) : -1);
    } else {
      setQuery('');
    }
  }, [open, filtered, value]);

  function handleToggle() {
    if (disabled) return;
    setOpen(v => !v);
  }

  function choose(idx) {
    const item = filtered[idx];
    if (!item) return;
    onChange(item.id);
    setOpen(false);
    // return focus to button
    buttonRef.current?.focus();
  }

  function clearSelection(e) {
    e.stopPropagation();
    onChange(null);
    setQuery('');
    setActiveIndex(-1);
  }

  function onKeyDown(e) {
    if (disabled) return;
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min((i < 0 ? -1 : i) + 1, filtered.length - 1));
      scrollActiveIntoView();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max((i < 0 ? filtered.length : i) - 1, 0));
      scrollActiveIntoView();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
      scrollActiveIntoView(true);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(filtered.length - 1);
      scrollActiveIntoView(true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(activeIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
  }

  function scrollActiveIntoView(forceCenter = false) {
    requestAnimationFrame(() => {
      const list = listRef.current;
      const item = list?.querySelector('[data-active="true"]');
      if (!list || !item) return;
      const itemTop = item.offsetTop;
      const itemBottom = itemTop + item.offsetHeight;
      const viewTop = list.scrollTop;
      const viewBottom = viewTop + list.clientHeight;
      if (forceCenter) {
        list.scrollTop = itemTop - list.clientHeight / 2 + item.offsetHeight / 2;
      } else if (itemTop < viewTop) {
        list.scrollTop = itemTop;
      } else if (itemBottom > viewBottom) {
        list.scrollTop = itemBottom - list.clientHeight;
      }
    });
  }

  return (
    <div ref={rootRef} className={`w-full relative z-[100] ${className}`}>
      {label && <label className='mb-1.5 block text-sm font-medium text-slate-700'>{label}</label>}

      {/* Button */}
      <button ref={buttonRef} type='button' aria-haspopup='listbox' aria-expanded={open} aria-controls='select-listbox' disabled={disabled} onClick={handleToggle} onKeyDown={onKeyDown} className={[' border-slate-100 shadow-none h-[40px] group relative w-full inline-flex items-center justify-between', 'rounded-xl border bg-white px-3.5 py-2.5', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer', error ? 'border-rose-500' : 'border-slate-300 hover:border-slate-400 focus:border-indigo-500', ' focus:outline-none focus:ring-4 focus:ring-indigo-100', 'transition-colors'].join(' ')}>
        <span className={`truncate text-left ${selected ? 'text-slate-900' : 'text-slate-400'}`}>{selected ? selected.label : placeholder}</span>

        <span className='ml-3 flex items-center gap-1'>
          {clearable && selected && !disabled && <X size={16} className='opacity-60 hover:opacity-100 transition' onClick={clearSelection} aria-label='Clear selection' />}
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
            <ChevronDown size={18} className='text-slate-600' />
          </motion.span>
        </span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div key='dropdown' initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 6, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }} className='relative'>
            <div className={['absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white', 'shadow-lg ring-1 ring-black/5 overflow-hidden'].join(' ')}>
              {/* Search */}
              {searchable && (
                <div className='p-2 border-b border-slate-100'>
                  <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder='Type to filter…' className='w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100' />
                </div>
              )}

              {/* List */}
              <ul id='select-listbox' role='listbox' ref={listRef} className='max-h-56 overflow-auto py-1' aria-activedescendant={activeIndex >= 0 ? `option-${filtered[activeIndex]?.id}` : undefined} onKeyDown={onKeyDown} tabIndex={-1}>
                {filtered.length === 0 && <li className='px-3 py-2 text-sm text-slate-400'>No results</li>}

                {filtered.map((opt, idx) => {
                  const isSelected = selected?.id === opt.id;
                  const isActive = idx === activeIndex;

                  return (
                    <motion.li
                      layout
                      key={opt.id}
                      id={`option-${opt.id}`}
                      role='option'
                      aria-selected={isSelected}
                      data-active={isActive ? 'true' : undefined}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseDown={e => e.preventDefault()} // avoid button blur
                      onClick={() => choose(idx)}
                      className={['mx-1 my-0.5 rounded-xl px-3 py-2 text-sm flex items-center justify-between', isActive ? 'bg-indigo-50' : 'bg-transparent', 'cursor-pointer select-none'].join(' ')}
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 24 }}>
                      <span className='truncate text-slate-800'>{opt.label}</span>
                      <AnimatePresence>
                        {isSelected && (
                          <motion.span key='check' initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                            <Check size={16} className='text-indigo-600' />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className='mt-1.5 text-xs text-rose-600'>{error}</p>}
    </div>
  );
}
