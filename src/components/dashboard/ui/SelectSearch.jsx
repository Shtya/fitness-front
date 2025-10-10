'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Check, Search } from 'lucide-react';

export default function SelectSearch({
  options = [], // [{ id: '1', label: 'Option 1' }, ...]
  value = null, // selected id
  onChange = () => {},
  placeholder = 'Select…',
  searchable = true,
  disabled = false,
  clearable = true,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const [portalReady, setPortalReady] = useState(false);

  // Fixed-position coords for the portal menu
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const selected = useMemo(
    () => options.find(o => o.id === value) || null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => String(o.label).toLowerCase().includes(q));
  }, [options, query]);

  const updateCoords = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 6, // little gap
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const openMenu = useCallback(() => {
    if (disabled) return;
    updateCoords();
    setOpen(true);
    setTimeout(updateCoords, 0); // ensure after layout
  }, [disabled, updateCoords]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);
  }, []);

  // Prepare portal
  useEffect(() => {
    setPortalReady(true);
  }, []);

  // Reposition on resize/scroll/route changes
  useEffect(() => {
    if (!open) return;
    const handler = () => updateCoords();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    const obs = new ResizeObserver(handler);
    if (buttonRef.current) obs.observe(buttonRef.current);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
      obs.disconnect();
    };
  }, [open, updateCoords]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDocClick = e => {
      const t = e.target;
      if (buttonRef.current?.contains(t) || listRef.current?.contains(t)) return;
      closeMenu();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, closeMenu]);

  // Keyboard interactions
  const onKeyDown = e => {
    if (!open) {
      if (['ArrowDown', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
        setActiveIndex(0);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      buttonRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => {
        const next = Math.min((i < 0 ? -1 : i) + 1, filtered.length - 1);
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => {
        const next = Math.max((i < 0 ? filtered.length : i) - 1, 0);
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[activeIndex];
      if (item) {
        onChange(item.id);
        closeMenu();
        buttonRef.current?.focus();
      }
    } else if (e.key === 'Tab') {
      // close on tab to avoid trapping
      closeMenu();
    }
  };

  const scrollIntoView = index => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[index + (searchable ? 1 : 0)]; // account for search row
    if (!item) return;
    const listRect = list.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    if (itemRect.top < listRect.top) {
      list.scrollTop -= listRect.top - itemRect.top;
    } else if (itemRect.bottom > listRect.bottom) {
      list.scrollTop += itemRect.bottom - listRect.bottom;
    }
  };

  const pick = item => {
    onChange(item.id);
    closeMenu();
    buttonRef.current?.focus();
  };

  const clear = e => {
    e.stopPropagation();
    onChange(null);
    setQuery('');
    setActiveIndex(-1);
    // keep menu closed; user can open again
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* Trigger (indigo-themed UI) */}
      <button
        type="button"
        ref={buttonRef}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onKeyDown}
        disabled={disabled}
        className={[
          'h-[43px] group relative w-full inline-flex items-center justify-between',
          'rounded-lg border bg-white px-3.5 py-2.5 text-sm',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          'transition-colors',
          // borders & focus states
          'border-slate-300 hover:border-slate-400 focus:border-indigo-500',
          'focus:outline-none focus:ring-4 focus:ring-indigo-100',
        ].join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`truncate text-left ${selected ? 'text-slate-900' : 'text-gray-500'}`}>
          {selected ? selected.label : (placeholder || 'Select…')}
        </span>

        <span className="ml-3 flex items-center gap-1">
          {clearable && selected && !disabled && (
            <X className="h-4 w-4 opacity-60 hover:opacity-100 transition" onClick={clear} />
          )}
          <ChevronDown className="h-4 w-4 text-slate-600" />
        </span>
      </button>

      {/* Portal dropdown (indigo-styled UI) */}
      {portalReady &&
        open &&
        createPortal(
          <div
            role="listbox"
            aria-activedescendant={activeIndex >= 0 ? `opt-${activeIndex}` : undefined}
            className="z-[99999999] fixed mt-0"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            <div
              ref={listRef}
              className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-black/5"
              onKeyDown={onKeyDown}
            >
              {/* Search row */}
              {searchable && (
                <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      className="w-full h-9 pl-10 pr-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white"
                      placeholder="Search…"
                      value={query}
                      onChange={e => {
                        setQuery(e.target.value);
                        setActiveIndex(0);
                      }}
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* Options */}
              <ul className="py-1">
                {filtered.length === 0 && (
                  <li className="px-3 py-2 text-sm text-slate-400">No results</li>
                )}
                {filtered.map((item, idx) => {
                  const isSelected = selected?.id === item.id;
                  const isActive = idx === activeIndex;
                  return (
                    <li
                      id={`opt-${idx}`}
                      key={item.id}
                      role="option"
                      aria-selected={isSelected}
                      className={[
                        'mx-1 my-0.5 rounded-lg px-3 py-2 text-sm flex items-center justify-between select-none cursor-pointer',
                        isActive ? 'bg-indigo-50' : 'bg-transparent',
                        isSelected ? 'text-indigo-700' : 'text-slate-700',
                        'hover:bg-indigo-50',
                      ].join(' ')}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseDown={e => e.preventDefault()} // avoid blurring input
                      onClick={() => pick(item)}
                    >
                      <span className="truncate">{item.label}</span>
                      {isSelected && <Check className="h-4 w-4 text-indigo-600" />}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
