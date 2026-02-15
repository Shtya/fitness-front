'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Check, Search, Plus, CheckCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function Select({
  cnLabel,
  options = [],
  value = null,
  onChange = () => {},
  placeholder,
  searchable = true,
  disabled = false,
  clearable = true,
  className = '',
  label,
  cnInputParent,
  allowCustom = false,
  createHint = 'Write a new category…',
  icon,
  error,
}) {
  const t = useTranslations();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [createMode, setCreateMode] = useState(false);
  const [createText, setCreateText] = useState('');

  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const menuRef = useRef(null);
  const createInputRef = useRef(null);

  const [portalReady, setPortalReady] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, placement: 'bottom' });

  const selectedOption = useMemo(
    () => options.find(o => String(o.id) === String(value)) || null,
    [options, value],
  );

  const buttonLabel = useMemo(() => {
    if (selectedOption) return selectedOption.label;
    if (typeof value === 'string' && value.trim()) return value;
    return placeholder || t('common.select');
  }, [selectedOption, value, placeholder, t]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!searchable || !q) return options;
    return options.filter(o => String(o.label).toLowerCase().includes(q));
  }, [options, query, searchable]);

  const hasExactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return false;
    return options.some(o => String(o.label).toLowerCase() === q);
  }, [options, query]);

  // --- POSITIONING ---
  const updatePosition = useCallback(preferredPlacement => {
    if (!buttonRef.current) return;
    const triggerRect = buttonRef.current.getBoundingClientRect();
    const gap = 6;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const width = triggerRect.width;
    const clampedLeft = Math.max(8, Math.min(triggerRect.left, viewportWidth - width - 8));

    let placement = preferredPlacement || 'bottom';
    let top = triggerRect.bottom + gap;

    const menuEl = menuRef.current;
    const menuHeight = menuEl ? menuEl.offsetHeight : 0;

    if (menuHeight) {
      const spaceBelow = viewportHeight - triggerRect.bottom - gap;
      const spaceAbove = triggerRect.top - gap;
      if (placement === 'bottom' && menuHeight > spaceBelow && spaceAbove > spaceBelow) placement = 'top';
      else if (placement === 'top' && menuHeight > spaceAbove && spaceBelow > spaceAbove) placement = 'bottom';

      if (placement === 'bottom') top = Math.min(triggerRect.bottom + gap, viewportHeight - menuHeight - gap);
      else top = Math.max(triggerRect.top - menuHeight - gap, gap);
    }

    setCoords(prev => {
      const next = { top, left: clampedLeft, width, placement };
      if (prev.top === next.top && prev.left === next.left && prev.width === next.width && prev.placement === next.placement) return prev;
      return next;
    });
  }, []);

  const openMenu = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    requestAnimationFrame(() => updatePosition('bottom'));
  }, [disabled, updatePosition]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);
    setCreateMode(false);
    setCreateText('');
  }, []);

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => updatePosition());
    return () => cancelAnimationFrame(id);
  }, [open, query, filtered.length, createMode, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handler = () => updatePosition();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    const obs = new ResizeObserver(handler);
    if (buttonRef.current) obs.observe(buttonRef.current);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
      obs.disconnect();
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = e => {
      if (buttonRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      closeMenu();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, closeMenu]);

  useEffect(() => {
    if (createMode) setTimeout(() => createInputRef.current?.focus(), 0);
  }, [createMode]);

  const scrollIntoView = index => {
    const list = listRef.current;
    if (!list) return;
    const offset = searchable ? 1 : 0;
    const item = list.children[index + offset];
    if (!item) return;
    const listRect = list.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    if (itemRect.top < listRect.top) list.scrollTop -= listRect.top - itemRect.top;
    else if (itemRect.bottom > listRect.bottom) list.scrollTop += itemRect.bottom - listRect.bottom;
  };

  const onKeyDown = e => {
    if (!open) {
      if (['ArrowDown', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
        setActiveIndex(0);
      }
      return;
    }
    if (createMode) {
      if (e.key === 'Escape') { e.preventDefault(); setCreateMode(false); setCreateText(''); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(); buttonRef.current?.focus(); }
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => { const next = Math.min((i < 0 ? -1 : i) + 1, filtered.length - 1); scrollIntoView(next); return next; });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => { const next = Math.max((i < 0 ? filtered.length : i) - 1, 0); scrollIntoView(next); return next; });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[activeIndex];
      if (item) { onChange(item.id); closeMenu(); buttonRef.current?.focus(); }
    } else if (e.key === 'Tab') closeMenu();
  };

  const pick = item => { onChange(item.id); closeMenu(); buttonRef.current?.focus(); };
  const clear = e => { e.stopPropagation(); onChange(null); setQuery(''); setActiveIndex(-1); };
  const createFromText = text => {
    const tValue = (text ?? '').trim();
    if (!tValue) return;
    onChange(tValue);
    closeMenu();
    buttonRef.current?.focus();
  };

  // --- THEME STYLES (inline to use CSS vars) ---
  const triggerFocusStyle = {
    borderColor: 'var(--color-primary-500)',
    boxShadow: '0 0 0 3px color-mix(in srgb, var(--color-primary-500) 15%, transparent)',
  };
  const triggerBaseStyle = {
    borderColor: '#cbd5e1',
  };
  const triggerHoverStyle = {
    borderColor: 'var(--color-primary-300)',
  };

  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const getTriggerStyle = () => {
    if (open || isFocused) return triggerFocusStyle;
    if (isHovered) return triggerHoverStyle;
    return triggerBaseStyle;
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label && (
        <label className={`${cnLabel || ''} mb-1.5 block text-sm font-semibold text-slate-600 tracking-wide uppercase`} style={{ fontSize: '0.7rem', letterSpacing: '0.06em' }}>
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type='button'
        ref={buttonRef}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={disabled}
        aria-haspopup='listbox'
        aria-expanded={open}
        style={getTriggerStyle()}
        className={[
          cnInputParent || '',
          'h-[43px] relative w-full inline-flex items-center justify-between gap-2',
          'rounded-lg border bg-white px-3 py-2.5 text-sm',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          'transition-all duration-200 outline-none',
        ].join(' ')}
      >
        {/* Left: icon + label */}
        <span className='flex items-center gap-2 truncate'>
          {icon && <span className='text-slate-400 flex-shrink-0'>{icon}</span>}
          <span className={`truncate ${selectedOption || (typeof value === 'string' && value.trim()) ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
            {buttonLabel}
          </span>
        </span>

        {/* Right: clear + chevron */}
        <span className='flex items-center gap-1 flex-shrink-0'>
          {clearable && (selectedOption || (typeof value === 'string' && value)) && !disabled && (
            <X className='max-md:hidden h-4 w-4 text-slate-400 hover:text-slate-600 transition' onClick={clear} />
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* Error */}
      {error && (
        <p className='mt-1.5 text-xs text-rose-500'>{error}</p>
      )}

      {/* Portal Dropdown */}
      {portalReady &&
        open &&
        createPortal(
          <div
            ref={menuRef}
            role='listbox'
            aria-activedescendant={activeIndex >= 0 ? `opt-${activeIndex}` : undefined}
            className='z-[99999999] fixed'
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            <div
              ref={listRef}
              className='max-h-[215px] overflow-auto rounded-lg border border-slate-200 bg-white'
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)' }}
              onKeyDown={onKeyDown}
            >
              {/* Search input */}
              {searchable && !createMode && (
                <div className='p-2 border-b border-slate-100 sticky top-0 bg-white'>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
                    <input
                      className='w-full h-9 pl-10 pr-3 py-2 rounded-lg border border-slate-200 text-sm outline-none bg-white transition-all duration-200'
                      style={{ '--focus-border': 'var(--color-primary-500)' }}
                      placeholder={t('common.search')}
                      value={query}
                      onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
                      onFocus={e => { e.target.style.borderColor = 'var(--color-primary-500)'; e.target.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--color-primary-500) 15%, transparent)'; }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
              )}

              {/* Create mode input */}
              {allowCustom && createMode && (
                <div className='p-2 border-b border-slate-100 sticky top-0 bg-white'>
                  <div className='flex gap-2'>
                    <input
                      ref={createInputRef}
                      className='flex-1 h-9 px-3 rounded-lg border border-slate-200 text-sm outline-none transition-all duration-200'
                      placeholder={createHint}
                      value={createText}
                      onChange={e => setCreateText(e.target.value)}
                      onFocus={e => { e.target.style.borderColor = 'var(--color-primary-500)'; e.target.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--color-primary-500) 15%, transparent)'; }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); createFromText(createText); }
                        if (e.key === 'Escape') { e.preventDefault(); setCreateMode(false); setCreateText(''); }
                      }}
                    />
                    <button
                      type='button'
                      onClick={() => createFromText(createText)}
                      className='inline-flex items-center justify-center rounded-lg px-2.5 h-9 border border-slate-200 hover:border-slate-300 bg-white transition-all duration-200'
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary-400)'; e.currentTarget.style.background = 'color-mix(in srgb, var(--color-primary-500) 6%, white)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
                    >
                      <CheckCheck className='w-4 h-4 text-slate-600' />
                    </button>
                    <button
                      type='button'
                      onClick={() => { setCreateMode(false); setCreateText(''); }}
                      className='inline-flex items-center justify-center rounded-lg px-2.5 h-9 border border-slate-200 hover:border-slate-300 bg-white transition-all duration-200'
                    >
                      <X className='w-4 h-4 text-slate-500' />
                    </button>
                  </div>
                </div>
              )}

              {/* Options list */}
              {!createMode && (
                <>
                  <ul className='py-1.5'>
                    {filtered.length === 0 && (
                      <li className='px-3 py-2.5 text-sm text-slate-400 text-center'>{t('common.noResult')}</li>
                    )}
                    {filtered.map((item, idx) => {
                      const isSelected = selectedOption?.id === item.id;
                      const isActive = idx === activeIndex;
                      return (
                        <li
                          id={`opt-${idx}`}
                          key={item.id}
                          role='option'
                          aria-selected={isSelected}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => pick(item)}
                          className='mx-1.5 rounded-lg px-3 py-2 text-sm flex items-center justify-between select-none cursor-pointer transition-all duration-150'
                          style={{
                            background: isActive || isSelected
                              ? 'color-mix(in srgb, var(--color-primary-500) 8%, white)'
                              : 'transparent',
                            color: isSelected ? 'var(--color-primary-700)' : '#475569',
                          }}
                        >
                          <span className='truncate font-medium'>{item.label}</span>
                          {isSelected && <Check className='h-4 w-4 flex-shrink-0' style={{ color: 'var(--color-primary-600)' }} />}
                        </li>
                      );
                    })}
                  </ul>

                  {/* Quick-create from search */}
                  {allowCustom && query.trim() && !hasExactMatch && (
                    <div className='p-2 border-t border-slate-100 sticky bottom-0 bg-white'>
                      <button
                        type='button'
                        onClick={() => createFromText(query)}
                        className='w-full inline-flex items-center justify-center gap-2 rounded-lg h-9 text-sm border border-dashed border-slate-300 hover:border-slate-400 transition-all duration-200'
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary-400)'; e.currentTarget.style.background = 'color-mix(in srgb, var(--color-primary-500) 5%, white)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.background = ''; }}
                      >
                        <Plus className='w-4 h-4 text-slate-500' />
                        <span className='text-slate-600'>Create "<strong>{query.trim()}</strong>"</span>
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Create new button */}
              {!createMode && allowCustom && (
                <div className='p-2 border-t border-slate-100 sticky bottom-0 bg-white'>
                  <button
                    type='button'
                    onClick={() => { setCreateMode(true); setCreateText(''); }}
                    className='w-full inline-flex items-center justify-center gap-2 rounded-lg h-9 text-sm border border-slate-200 transition-all duration-200'
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary-400)'; e.currentTarget.style.background = 'color-mix(in srgb, var(--color-primary-500) 5%, white)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = ''; }}
                  >
                    <Plus className='w-4 h-4 text-slate-500' />
                    <span className='text-slate-600'>{createHint}</span>
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}