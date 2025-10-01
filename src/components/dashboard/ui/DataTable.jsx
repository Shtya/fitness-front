
'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, CheckSquare, Square } from 'lucide-react';

const spring = { type: 'spring', stiffness: 360, damping: 30, mass: 0.7 };

export default function DataTable({ columns = [], data = [], loading = false, itemsPerPage = 10, pagination = true, emptyState = null, skeletonRows = 6, selectable = false, selectedIds = [], onToggleRow, onToggleAll, onRowClick, stickyHeader = true, initialSort }) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(initialSort || null);

  useEffect(() => setPage(1), [data.length, itemsPerPage]);

  const sorted = useMemo(() => {
    if (!sort || !sort.key) return data;
    const col = columns.find(c => (c.accessor || '') === sort.key);
    if (col?.disableSort) return data;

    const dirMul = sort.dir === 'desc' ? -1 : 1;
    return [...data].sort((a, b) => {
      const va = get(a, sort.key);
      const vb = get(b, sort.key);
      if (va == null && vb == null) return 0;
      if (va == null) return -1 * dirMul;
      if (vb == null) return 1 * dirMul;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dirMul;
      return String(va).localeCompare(String(vb)) * dirMul;
    });
  }, [data, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const start = (page - 1) * itemsPerPage;
  const pageData = pagination ? sorted.slice(start, start + itemsPerPage) : sorted;

  const allPageIds = useMemo(() => (pageData || []).map(r => r.id), [pageData]);
  const allChecked = selectable && allPageIds.length > 0 && allPageIds.every(id => selectedIds?.includes(id));

  const toggleSort = (key, disableSort) => {
    if (disableSort) return;
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null; // turn off sort on third click
    });
  };

  return (
    <div className='w-full'>
      <div className='overflow-x-auto'>
        <table className='min-w-full text-sm'>
          <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
            <tr className='bg-slate-50 text-slate-600'>
              {selectable && (
                <th className='px-4 py-3 text-left w-10'>
                  <button onClick={() => onToggleAll?.(allPageIds)} className='inline-flex items-center gap-2 text-slate-700' aria-label='Toggle select all'>
                    {allChecked ? <CheckSquare className='w-4 h-4' /> : <Square className='w-4 h-4' />}
                  </button>
                </th>
              )}
              {columns.map(c => {
                return (
                  <th key={c.header + c.accessor} className='px-4 py-3 text-left select-none'>
                    <button className={`inline-flex items-center gap-1   hover:text-slate-900`} onClick={() => toggleSort(c.accessor, c.disableSort)} title={c.disableSort ? '' : 'Sort'}>
                      <span className='font-medium'>{c.header}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <SkeletonBlock columns={columns} count={skeletonRows} selectable={selectable} />
            ) : pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)}>{emptyState || <DefaultEmptyState />}</td>
              </tr>
            ) : (
              pageData.map(row => (
                <motion.tr key={row.id ?? JSON.stringify(row)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='border-t border-slate-100 hover:bg-slate-50/50' onClick={onRowClick ? () => onRowClick(row) : undefined} role={onRowClick ? 'button' : undefined}>
                  {selectable && (
                    <td className='px-4 py-3'>
                      <input type='checkbox' checked={selectedIds?.includes(row.id)} onChange={() => onToggleRow?.(row.id)} className='w-4 h-4' onClick={e => e.stopPropagation()} />
                    </td>
                  )}
                  {columns.map(c => (
                    <td key={c.accessor} className={`px-4 py-3 align-middle ${c?.className} `}>
                      {c.cell ? c.cell(row) : toDisplay(get(row, c.accessor))}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && !loading && pageData.length > 0 && (
        <div className='flex items-center justify-between p-3 border-t border-slate-100 text-sm'>
          <div className='text-slate-600'>
            Page <span className='font-medium'>{page}</span> of <span className='font-medium'>{totalPages}</span>
          </div>
          <div className='flex items-center gap-1'>
            <PagerBtn disabled={page === 1} onClick={() => setPage(1)}>
              <ChevronsLeft className='w-4 h-4' />
            </PagerBtn>
            <PagerBtn disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              <ChevronLeft className='w-4 h-4' />
            </PagerBtn>
            <PagerBtn disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
              <ChevronRight className='w-4 h-4' />
            </PagerBtn>
            <PagerBtn disabled={page === totalPages} onClick={() => setPage(totalPages)}>
              <ChevronsRight className='w-4 h-4' />
            </PagerBtn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- small helpers ---------- */

function PagerBtn({ children, disabled, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition
        ${disabled ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
      aria-disabled={disabled}>
      {children}
    </button>
  );
}

function SkeletonBlock({ columns, count = 6, selectable }) {
  const widths = [160, 220, 140, 120, 110, 200, 90, 130];
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className='animate-pulse'>
          {selectable && (
            <td className='px-4 py-3'>
              <div className='w-4 h-4 bg-slate-200 rounded' />
            </td>
          )}
          {columns.map((_, ci) => (
            <td key={ci} className='px-4 py-3'>
              <div className='h-3 rounded bg-slate-200' style={{ width: widths[ci % widths.length] }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function DefaultEmptyState() {
  return (
    <div className='text-center py-16'>
      <div className='mx-auto w-14 h-14 rounded-2xl bg-slate-100' />
      <h3 className='mt-4 text-lg font-semibold'>No data</h3>
      <p className='text-sm text-slate-600 mt-1'>Adjust filters or add new records.</p>
    </div>
  );
}

function get(obj, path) {
  if (!path) return undefined;
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}
function toDisplay(v) {
  if (v == null || v === '') return <span className='text-slate-400'>—</span>;
  return String(v);
}
