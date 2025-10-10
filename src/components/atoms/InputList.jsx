import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';

export default function TagInput({
  label, value, fieldName, getValues, setValue,
  placeholder = 'Type and press Enter…', errors, onChange, onRemoveItemHandler,
  maxTags, className
}) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  const tags = useMemo(() => {
    if (Array.isArray(value)) return value;
    const current = getValues(fieldName);
    return Array.isArray(current) ? current : [];
  }, [value, getValues, fieldName]);

  const canAddMore = typeof maxTags === 'number' ? tags.length < maxTags : true;
  const errorMsg = errors?.[fieldName]?.message;

  const commit = useCallback(
    raw => {
      if (!raw) return;
      const pieces = raw.split(/[,\n]/g).map(s => s.trim()).filter(Boolean);
      if (!pieces.length) return;

      let next = [...tags];
      for (const p of pieces) {
        if (!p) continue;
        if (next.includes(p)) continue; // de-duplicate
        if (!canAddMore) break;
        next.push(p);
      }
      if (next.length !== tags.length) {
        setValue(fieldName, next, { shouldValidate: true, shouldDirty: true });
        onChange?.(next);
      }
    },
    [tags, setValue, fieldName, onChange, canAddMore],
  );

  const handleAddClick = () => {
    if (!canAddMore) return;
    commit(inputValue);
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleRemove = idx => {
    const next = tags.filter((_, i) => i !== idx);
    setValue(fieldName, next, { shouldValidate: true, shouldDirty: true });
    onChange?.(next);
    onRemoveItemHandler?.(idx);
    inputRef.current?.focus();
  };

  const onKeyDown = e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddClick();
      return;
    }
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      e.preventDefault();
      handleRemove(tags.length - 1);
    }
  };

  const onPaste = e => {
    const text = e.clipboardData.getData('text');
    if (!text) return;
    e.preventDefault();
    commit(text);
    setInputValue('');
  };

  // focus input when container clicked (ignore chip X buttons)
  const containerRef = useRef(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = ev => {
      if (ev.target.closest('button[data-chip]')) return;
      inputRef.current?.focus();
    };
    el.addEventListener('mousedown', handler);
    return () => el.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={className || ''}>
      {label && <label className='block text-sm font-medium text-slate-700 mb-2'>{label}</label>}

      <div
        ref={containerRef}
        className={[
          'w-full min-h-[44px] rounded-lg border px-2 py-1.5 flex items-center gap-1 flex-wrap',
          'bg-white shadow-sm transition-colors',
          errorMsg
            ? 'border-red-500 ring-2 ring-red-500/20'
            : 'border-slate-300 hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100',
        ].join(' ')}
      >
        {/* chips */}
        {tags.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className='border border-indigo-100 inline-flex items-center gap-1 rounded-lg bg-indigo-50 text-indigo-700 px-2.5 py-1 text-sm'
          >
            {t}
            <button
              type='button'
              data-chip
              onClick={() => handleRemove(i)}
              title='Remove'
              className='cursor-pointer text-indigo-600 hover:text-indigo-700 transition'
            >
              <X size={13} />
            </button>
          </span>
        ))}

        {/* input + add */}
        <div className='relative flex-1 min-w-[120px]'>
          <input
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onBlur={() => {
              if (inputValue.trim()) {
                commit(inputValue);
                setInputValue('');
              }
            }}
            placeholder={tags.length ? '' : placeholder}
            className='w-full border-0 outline-none focus:ring-0 text-sm text-slate-900 placeholder:text-slate-400 pr-8'
            disabled={!canAddMore}
          />
          <button
            type='button'
            onClick={handleAddClick}
            title='Add'
            className='absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-40'
            disabled={!canAddMore || !inputValue.trim()}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {errorMsg && <p className='text-red-500 text-sm mt-1'>{errorMsg}</p>}

      {typeof maxTags === 'number' && (
        <p className='text-xs text-slate-500 mt-1'>
          {tags.length}/{maxTags} tags
        </p>
      )}
    </div>
  );
}
