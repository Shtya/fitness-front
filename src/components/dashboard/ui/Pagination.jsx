import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from 'lucide-react';

 
export function PrettyPagination({ page, totalPages, onPageChange, className = '', showEdges = true, maxButtons = 7, compactUntil = 480, pageSize, onPageSizeChange, pageSizeOptions = [10, 20, 50, 100] }) {
  if (!totalPages || totalPages <= 1) return null;

  const isCompact = typeof window !== 'undefined' ? window.innerWidth <= compactUntil : false;
  const clamp = p => Math.max(1, Math.min(totalPages, p));
  const go = p => onPageChange?.(clamp(p));

  const items = useMemo(() => {
    // Build a range with ellipses: [1, '…', 5,6,7, '…', total]
    const count = Math.max(3, maxButtons); // at least room for first, last, and one middle
    const side = Math.floor((count - 3) / 2); // neighbors around current
    const left = Math.max(2, page - side);
    const right = Math.min(totalPages - 1, page + side);

    const arr = [1];
    if (left > 2) arr.push('ellipsis-left');
    for (let i = left; i <= right; i++) arr.push(i);
    if (right < totalPages - 1) arr.push('ellipsis-right');
    if (totalPages > 1) arr.push(totalPages);
    // When totalPages small, dedupe automatically by Set-like filter:
    return arr.filter((v, i, a) => a.indexOf(v) === i);
  }, [page, totalPages, maxButtons]);

  // Button base styles
  const baseBtn = 'inline-flex items-center justify-center rounded-lg border text-sm font-medium transition ' + 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30 ' + 'disabled:opacity-40 disabled:cursor-not-allowed';
  const solid = 'bg-[#4f39f6] text-white border-[#4f39f6] hover:bg-indigo-600';
  const ghost = 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50';
  const subtle = 'bg-white/70 text-slate-700 border-slate-200 hover:bg-white';

  return (
    <nav className={`flex flex-wrap items-center justify-center gap-3 ${className}`} role='navigation' aria-label='Pagination'>
      {/* Optional page size */}
      {onPageSizeChange ? (
        <div className='flex items-center gap-2'>
          <label className='text-xs text-slate-600'>Rows per page</label>
          <div className='relative'>
            <select className='rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-400/30' value={pageSize ?? pageSizeOptions[0]} onChange={e => onPageSizeChange?.(Number(e.target.value))}>
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div />
      )}

      {/* Main controls */}
      <div className='flex items-center gap-1.5 rounded-lg bg-slate-100/70 p-1 ring-1 ring-black/5'>
        {/* Edges */}
        {showEdges && !isCompact && (
          <button type='button' onClick={() => go(1)} disabled={page <= 1} className={`${baseBtn} ${subtle} h-9 w-9`} aria-label='First page'>
            <ChevronsLeft size={16} />
          </button>
        )}

        {/* Prev */}
        <button type='button' onClick={() => go(page - 1)} disabled={page <= 1} className={`${baseBtn} ${subtle} h-9 w-9`} aria-label='Previous page'>
          <ChevronLeft size={18} />
        </button>

        {/* Compact mode shows only current/total */}
        {isCompact ? (
          <div className='mx-1 min-w-[90px] text-center text-sm text-slate-700'>
            <span className='font-semibold text-slate-900'>{page}</span> / {totalPages}
          </div>
        ) : (
          <>
            {items.map(it =>
              typeof it === 'number' ? (
                <button key={it} onClick={() => go(it)} aria-current={it === page ? 'page' : undefined} className={`${baseBtn} h-9 min-w-9 px-3 ${it === page ? solid : ghost}`}>
                  {it}
                </button>
              ) : (
                <span key={it} className='mx-0.5 inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-transparent px-2 text-slate-500' aria-hidden='true'>
                  <MoreHorizontal size={18} />
                </span>
              ),
            )}
          </>
        )}

        {/* Next */}
        <button type='button' onClick={() => go(page + 1)} disabled={page >= totalPages} className={`${baseBtn} ${subtle} h-9 w-9`} aria-label='Next page'>
          <ChevronRight size={18} />
        </button>

        {/* Edges */}
        {showEdges && !isCompact && (
          <button type='button' onClick={() => go(totalPages)} disabled={page >= totalPages} className={`${baseBtn} ${subtle} h-9 w-9`} aria-label='Last page'>
            <ChevronsRight size={16} />
          </button>
        )}
      </div>
 
    </nav>
  );
}
