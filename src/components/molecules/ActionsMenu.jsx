'use client';

import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { MoreHorizontal } from 'lucide-react';

/**
 * Reusable actions menu (3-dots) rendered via portal to avoid clipping.
 * Props:
 *  - options: [{ icon, label, onClick, danger, disabled, hide }]
 *  - align: "right" | "left" (default "right")
 *  - buttonClassName: optional class for the trigger button
 */
export default function ActionsMenu({ options = [], align = 'right', buttonClassName = '', ariaLabel = 'Row actions', onOpenChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const [placement, setPlacement] = useState('bottom'); // or "top" if flipped
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const visibleOptions = options.filter(o => !o?.hide);

  const close = useCallback(() => {
    setOpen(false);
    onOpenChange && onOpenChange(false);
  }, [onOpenChange]);

  const computePos = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const menuW = 192; // expected width
    const gap = 8;

    // Default horizontal placement
    let left = align === 'right' ? rect.right + scrollX - menuW : rect.left + scrollX;

    // Clamp horizontally to viewport padding
    left = Math.max(scrollX + 8, Math.min(left, scrollX + vw - 8 - menuW));

    // Vertical: try below, flip above if not enough space
    const roomBelow = vh - rect.bottom;
    const openBelow = roomBelow >= 180; // heuristic height
    const top = openBelow ? rect.bottom + scrollY + gap : rect.top + scrollY - gap;

    setPlacement(openBelow ? 'bottom' : 'top');
    setPos({ top, left, width: Math.max(rect.width, 160) });
  }, [align]);

  // Toggle & compute position
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) computePos();
    onOpenChange && onOpenChange(next);
  };

  // Reposition on window changes
  useLayoutEffect(() => {
    if (!open) return;
    computePos();
  }, [open, computePos]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => computePos();
    const onScroll = () => computePos();
    const onKey = e => e.key === 'Escape' && close();

    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, computePos, close]);


	useEffect(() => {
    if (!open) return;
    const handler = e => {
      if (menuRef.current?.contains(e.target)) return;
      if (btnRef.current?.contains(e.target)) return;
      close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  return (
    <>
      <button ref={btnRef} type='button' onClick={toggle} aria-label={ariaLabel} aria-expanded={open} aria-haspopup='menu' className={buttonClassName || 'h-9 w-9 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50'}>
        <MoreHorizontal className='h-5 w-5 text-slate-700' />
      </button>

      {open &&
        createPortal(
          <div ref={menuRef} role='menu' style={{ position: 'absolute', top: pos.top, left: pos.left, minWidth: pos.width }} className='z-[9999] rounded-lg border border-slate-200 bg-white p-2 shadow-lg'>
            {visibleOptions.length === 0 ? (
              <div className='px-3 py-2 text-sm text-slate-400'>No actions</div>
            ) : (
              visibleOptions.map((opt, i) => (
                <button
                  key={i}
                  type='button'
                  role='menuitem'
                  disabled={opt.disabled}
                  onClick={() => {
                    if (opt.disabled) return;
                    close();
                    opt.onClick && opt.onClick();
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-slate-50 text-left
                    ${opt.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700'}
                    ${opt.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {opt.icon ? <span className='h-4 w-4'>{opt.icon}</span> : null}
                  <span className='truncate'>{opt.label}</span>
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

ActionsMenu.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      icon: PropTypes.node,
      label: PropTypes.string.isRequired,
      onClick: PropTypes.func,
      danger: PropTypes.bool,
      disabled: PropTypes.bool,
      hide: PropTypes.bool,
    }),
  ),
  align: PropTypes.oneOf(['right', 'left']),
  buttonClassName: PropTypes.string,
  ariaLabel: PropTypes.string,
  onOpenChange: PropTypes.func,
};
