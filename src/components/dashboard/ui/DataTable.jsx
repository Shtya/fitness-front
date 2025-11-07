'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckSquare, Square } from 'lucide-react';

const spring = { type: 'spring', stiffness: 360, damping: 30, mass: 0.7 };

function TruncatedText({ value, max = 15 }) {
  const locale = useLocale();
  if (value == null || value === '') {
    return <span className='text-slate-400'>—</span>;
  }

  const text = String(value);
  if (text.length <= max) {
    return <span className='whitespace-nowrap  '>{text}</span>;
  }

  const visible = locale == 'ar' ? '…' + text.slice(0, max) : text.slice(0, max) + '…';

  return (
    <span className='group relative inline-flex whitespace-nowrap align-middle'>
      {visible}
      <span
        className=' pointer-events-none absolute left-0 top-[115%] z-20 hidden w-fit max-w-[200px]
        whitespace-normal break-words rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs
        text-slate-700 shadow-xl group-hover:block'>
        {text}
      </span>
    </span>
  );
}

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  itemsPerPage = 10,
  pagination = true,
  emptyState = null,
  skeletonRows = 6,
  selectable = false,
  selectedIds = [],
  onToggleRow,
  onToggleAll,
  onRowClick,
  stickyHeader = true,
  initialSort,
  // NEW:
  serverPagination = false,
  page: controlledPage,
  onPageChange,
  totalRows,
}) {
  const t = useTranslations('DataTable');

  // keep internal page only if uncontrolled
  const [internalPage, setInternalPage] = useState(1);
  const page = controlledPage ?? internalPage;
  const setPage = onPageChange ?? setInternalPage;

  // reset internal page on data change only when uncontrolled
  useEffect(() => {
    if (controlledPage == null) setInternalPage(1);
  }, [data.length, itemsPerPage, controlledPage]);

  // sorting: if server paginating, don’t resort client-side
  const [sort, setSort] = useState(initialSort || null);
  const sorted = useMemo(() => {
    if (serverPagination) return data;
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
  }, [data, sort, columns, serverPagination]);

  // total pages: from server or from current data
  const totalPages = Math.max(1, serverPagination ? Math.ceil((totalRows ?? sorted.length) / itemsPerPage) : Math.ceil(sorted.length / itemsPerPage));

  // pageData: server mode → don’t slice (server already gave one page)
  const start = (page - 1) * itemsPerPage;
  const pageData = pagination ? (serverPagination ? sorted : sorted.slice(start, start + itemsPerPage)) : sorted;

  // select-all helpers (page-scoped)
  const allPageIds = useMemo(() => (pageData || []).map(r => r.id).filter(Boolean), [pageData]);
  const allChecked = useMemo(() => allPageIds.length > 0 && allPageIds.every(id => selectedIds?.includes(id)), [allPageIds, selectedIds]);

  // disable sort toggling in server mode (optional but less confusing)
  const toggleSort = (key, disableSort) => {
    if (disableSort || serverPagination) return;
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  return (
    <div className='w-full '>
      <div className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
        <div className='overflow-x-auto'>
          <table className='min-w-full text-sm'>
            <thead className={`${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
              <tr  className=' rounded-[20px_20px_0_0]  bg-slate-50/90 backdrop-blur supports-[backdrop-filter]:bg-slate-50/70 text-slate-600 border-b border-slate-200 shadow-[inset_0_-1px_0_rgba(15,23,42,0.06)]'>
                {selectable && (
                  <th className='px-4 py-3 rtl:text-right  text-left w-10'>
                    <button onClick={() => onToggleAll?.(allPageIds)} className='inline-flex items-center gap-2 text-slate-700' aria-label={t('toggleSelectAll')} title={t('toggleSelectAll')}>
                      {allChecked ? <CheckSquare className='w-4 h-4' /> : <Square className='w-4 h-4' />}
                    </button>
                  </th>
                )}
                {columns.map(c => (
                  <th key={c.header + c.accessor} className='px-4 py-3 rtl:text-right text-left select-none font-medium text-slate-700 whitespace-nowrap'>
                    <button className='inline-flex items-center gap-1 hover:text-slate-900' onClick={() => toggleSort(c.accessor, c.disableSort)} title={c.disableSort ? '' : t('sort')}>
                      <span>{c.header}</span>
                      {!c.disableSort && sort?.key === c.accessor && <span className='text-slate-400'>{sort.dir === 'asc' ? '↑' : '↓'}</span>}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <SkeletonBlock columns={columns} count={skeletonRows} selectable={selectable} />
              ) : pageData.length === 0 ? (
                <tr>
                  <td className='px-4 py-10' colSpan={columns.length + (selectable ? 1 : 0)}>
                    {emptyState || <DefaultEmptyState />}
                  </td>
                </tr>
              ) : (
                pageData.map(row => (
                  <motion.tr key={row.id ?? JSON.stringify(row)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='border-t border-slate-100 hover:bg-slate-50/60' onClick={onRowClick ? () => onRowClick(row) : undefined} role={onRowClick ? 'button' : undefined}>
                    {selectable && (
                      <td className='px-4 py-3 whitespace-nowrap'>
                        <input type='checkbox' checked={selectedIds?.includes(row.id)} onChange={() => onToggleRow?.(row.id)} className='w-4 h-4' onClick={e => e.stopPropagation()} aria-label={t('toggleRow')} title={t('toggleRow')} />
                      </td>
                    )}
                    {columns.map(c => (
                      <td key={c.accessor} className={`px-4 py-3 align-middle whitespace-nowrap ${c?.className || ''}`}>
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
          <div className='flex items-center justify-between p-3 border-t border-slate-200 text-sm bg-white'>
            <div className='text-slate-600'>{t('pageLabel', { page, total: totalPages })}</div>
            <div className='flex items-center gap-1'>
              <PagerBtn ariaLabel={t('first')} disabled={page === 1} onClick={() => setPage(1)}>
                <ChevronsLeft className='w-4 h-4 rtl:scale-x-[-1] ' />
              </PagerBtn>
              <PagerBtn ariaLabel={t('prev')} disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                <ChevronLeft className='w-4 h-4 rtl:scale-x-[-1]' />
              </PagerBtn>
              <PagerBtn ariaLabel={t('next')} disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                <ChevronRight className='w-4 h-4 rtl:scale-x-[-1]' />
              </PagerBtn>
              <PagerBtn ariaLabel={t('last')} disabled={page === totalPages} onClick={() => setPage(totalPages)}>
                <ChevronsRight className='w-4 h-4 rtl:scale-x-[-1]' />
              </PagerBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- small helpers ---------- */

function PagerBtn({ children, disabled, onClick, ariaLabel }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition
        ${disabled ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed' : 'border-slate-200 bg-white hover:bg-slate-50 active:scale-[.98]'}`}
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
            <td className='px-4 py-3 whitespace-nowrap'>
              <div className='w-4 h-4 bg-slate-200 rounded' />
            </td>
          )}
          {columns.map((_, ci) => (
            <td key={ci} className='px-4 py-3 whitespace-nowrap'>
              <div className='h-3 rounded bg-slate-200' style={{ width: widths[ci % widths.length] }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function DefaultEmptyState() {
  const t = useTranslations('DataTable');
  return (
    <div className='text-center py-10'>
      <div className='mx-auto w-14 h-14 rounded-lg bg-slate-100' />
      <h3 className='mt-3 text-base font-semibold'>{t('noData')}</h3>
      <p className='text-sm text-slate-600 mt-1'>{t('adjustFiltersOrAdd')}</p>
    </div>
  );
}

function get(obj, path) {
  if (!path) return undefined;
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

function toDisplay(v) {
  if (v == null || v === '') return <span className='text-slate-400'>—</span>;
  return <TruncatedText value={v} max={15} />;
}
