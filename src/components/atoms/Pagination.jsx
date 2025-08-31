'use client';

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

function makeRange(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * tokens: number | 'left-ellipsis' | 'right-ellipsis'
 */
function buildPageTokens({ page, totalPages, siblingCount = 1, boundaryCount = 1 }) {
  if (totalPages <= 1) return [1];

  const startPages = makeRange(1, Math.min(boundaryCount, totalPages));
  const endPages = makeRange(Math.max(totalPages - boundaryCount + 1, boundaryCount + 1), totalPages);

  const leftSibling = Math.max(page - siblingCount, boundaryCount + 2);
  const rightSibling = Math.min(page + siblingCount, totalPages - boundaryCount - 1);

  const showLeftEllipsis = leftSibling > boundaryCount + 2;
  const showRightEllipsis = rightSibling < totalPages - boundaryCount - 1;

  const middlePages = makeRange(Math.max(leftSibling, boundaryCount + 1), Math.min(rightSibling, totalPages - boundaryCount));

  const tokens = [...startPages, ...(showLeftEllipsis ? ['left-ellipsis'] : []), ...middlePages, ...(showRightEllipsis ? ['right-ellipsis'] : []), ...endPages];

  // de-duplicate if ranges touched
  return tokens.filter((v, i, a) => v !== a[i - 1]);
}

const btnVariants = {
  initial: { y: 0, scale: 1, opacity: 0, yOffset: 8 },
  in: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
  hover: {  scale: 1.02, transition: { type: 'spring', stiffness: 300, damping: 18 } },
  tap: { scale: 0.98 },
};

const dotVariants = {
  hover: { scale: 1.06, transition: { type: 'spring', stiffness: 300, damping: 18 } },
};

export default function Pagination({
  page,
  totalPages,
  setPage,
  className = '',
  siblingCount = 1,
  boundaryCount = 1,
  jumpBy = 5, // how many pages to jump when clicking ellipsis
}) {
  const navRef = useRef(null);
  if (totalPages <= 1) return null;

  const tokens = useMemo(() => buildPageTokens({ page, totalPages, siblingCount, boundaryCount }), [page, totalPages, siblingCount, boundaryCount]);

  const goTo = useCallback(
    p => {
      const next = Math.min(Math.max(1, p), totalPages);
      setPage(next);
    },
    [setPage, totalPages],
  );

  const onKey = useCallback(
    e => {
      if (e.key === 'ArrowLeft') goTo(page - 1);
      if (e.key === 'ArrowRight') goTo(page + 1);
    },
    [page, goTo],
  );

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [onKey]);

  return (
    <div className={`flex justify-center mt-8 ${className}`}>
      <nav ref={navRef} className='flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm px-2 py-1' aria-label='Pagination' role='navigation' tabIndex={0}>
        {/* Prev */}
        <motion.button variants={btnVariants} initial='initial' animate='in' whileHover='hover' whileTap='tap' type='button' onClick={() => goTo(page - 1)} disabled={page === 1} aria-label='Previous page' className=' cursor-pointer h-9 w-9 inline-flex items-center justify-center rounded-lg text-slate-600 enabled:hover:bg-slate-100 enabled:hover:text-slate-900 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50'>
          <ChevronLeft className='h-4 w-4' />
        </motion.button>

        {/* Pages */}
        {tokens.map((t, i) => {
          if (t === 'left-ellipsis' || t === 'right-ellipsis') {
            const jumpTarget = t === 'left-ellipsis' ? Math.max(1, page - jumpBy) : Math.min(totalPages, page + jumpBy);
            return (
              <motion.button key={`${t}-${i}`} variants={dotVariants} whileHover='hover' type='button' onClick={() => goTo(jumpTarget)} aria-label={`Jump to page ${jumpTarget}`} className=' cursor-pointer h-9 min-w-9 px-2 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500' title={`Jump ${t === 'left-ellipsis' ? `back ${jumpBy}` : `forward ${jumpBy}`} pages`}>
                <MoreHorizontal className='w-4 h-4' />
              </motion.button>
            );
          }

          const isActive = t === page;
          return (
            <motion.button key={t} variants={btnVariants} initial='initial' animate='in' whileHover='hover' whileTap='tap' type='button' onClick={() => goTo(t)} aria-current={isActive ? 'page' : undefined} className={[' cursor-pointer h-9 min-w-9 px-3 inline-flex items-center justify-center rounded-lg text-sm font-medium focus:outline-none focus:ring-2', isActive ? 'bg-emerald-500 text-white shadow-sm focus:ring-emerald-500' : 'text-slate-700 hover:bg-slate-100 focus:ring-emerald-500'].join(' ')}>
              {t}
            </motion.button>
          );
        })}

        {/* Next */}
        <motion.button variants={btnVariants} initial='initial' animate='in' whileHover='hover' whileTap='tap' type='button' onClick={() => goTo(page + 1)} disabled={page === totalPages} aria-label='Next page' className=' cursor-pointer  h-9 w-9 inline-flex items-center justify-center rounded-lg text-slate-600 enabled:hover:bg-slate-100 enabled:hover:text-slate-900 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50'>
          <ChevronRight className='h-4 w-4' />
        </motion.button>
      </nav>
    </div>
  );
}
