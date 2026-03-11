'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  CheckSquare, Square, Inbox, ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react';

const spring = { type: 'spring', stiffness: 360, damping: 30, mass: 0.7 };

/* ─────────────────────────── Tooltip cell ─────────────────────────── */
function TruncatedText({ value, max = 18 }) {
  const locale = useLocale();
  if (value == null || value === '') return <span className='text-slate-300'>—</span>;

  const text  = String(value);
  if (text.length <= max) return <span className='whitespace-nowrap'>{text}</span>;

  const visible = locale === 'ar' ? '…' + text.slice(0, max) : text.slice(0, max) + '…';

  return (
    <span className='group relative inline-flex whitespace-nowrap align-middle'>
      <span className='border-b border-dashed border-slate-300 cursor-help'>{visible}</span>
      <span className='pointer-events-none absolute left-0 top-[calc(100%+6px)] z-30 hidden min-w-[160px] max-w-[240px] whitespace-normal break-words rounded-lg border border-[var(--color-primary-100)] bg-white px-3 py-2 text-xs text-slate-700 shadow-xl ring-1 ring-black/5 group-hover:block'>
        {text}
      </span>
    </span>
  );
}

/* ─────────────────────────── Sort icon ─────────────────────────── */
function SortIcon({ active, dir }) {
  if (!active) return <ArrowUpDown className='h-3 w-3 opacity-30' />;
  return dir === 'asc'
    ? <ArrowUp   className='h-3 w-3 text-[var(--color-primary-600)]' />
    : <ArrowDown className='h-3 w-3 text-[var(--color-primary-600)]' />;
}

/* ─────────────────────────── Main component ─────────────────────────── */
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
  serverPagination = false,
  page: controlledPage,
  onPageChange,
  totalRows,
}) {
  const t = useTranslations('DataTable');

  const [internalPage, setInternalPage] = useState(1);
  const page    = controlledPage ?? internalPage;
  const setPage = onPageChange   ?? setInternalPage;

  useEffect(() => {
    if (controlledPage == null) setInternalPage(1);
  }, [data.length, itemsPerPage, controlledPage]);

  const [sort, setSort] = useState(initialSort || null);

  const sorted = useMemo(() => {
    if (serverPagination || !sort?.key) return data;
    const col = columns.find(c => (c.accessor || '') === sort.key);
    if (col?.disableSort) return data;
    const dir = sort.dir === 'desc' ? -1 : 1;
    return [...data].sort((a, b) => {
      const va = get(a, sort.key), vb = get(b, sort.key);
      if (va == null && vb == null) return 0;
      if (va == null) return -1 * dir;
      if (vb == null) return  1 * dir;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [data, sort, columns, serverPagination]);

  const totalPages = Math.max(
    1,
    serverPagination
      ? Math.ceil((totalRows ?? sorted.length) / itemsPerPage)
      : Math.ceil(sorted.length / itemsPerPage),
  );

  const start    = (page - 1) * itemsPerPage;
  const pageData = pagination
    ? (serverPagination ? sorted : sorted.slice(start, start + itemsPerPage))
    : sorted;

  const allPageIds = useMemo(() => (pageData || []).map(r => r.id).filter(Boolean), [pageData]);
  const allChecked = useMemo(
    () => allPageIds.length > 0 && allPageIds.every(id => selectedIds?.includes(id)),
    [allPageIds, selectedIds],
  );

  const toggleSort = (key, disableSort) => {
    if (disableSort || serverPagination) return;
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc')        return { key, dir: 'desc' };
      return null;
    });
  };

  return (
    <div className='w-full'>
      <div className='overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.07)]'>

        {/* ── Scrollable table ── */}
        <div className='overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200'>
          <table className='min-w-full text-sm'>

            {/* ── Head ── */}
            <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
              <tr className='border-b border-slate-200 bg-gradient-to-b from-[var(--color-primary-50)] to-white/90 backdrop-blur-sm'>

                {selectable && (
                  <th className='w-12 px-4 py-3.5 ltr:text-left rtl:text-right'>
                    <button
                      onClick={() => onToggleAll?.(allPageIds)}
                      aria-label={t('toggleSelectAll')}
                      className='inline-flex items-center transition-transform active:scale-90'>
                      {allChecked
                        ? <CheckSquare className='h-4 w-4 text-[var(--color-primary-600)]' />
                        : <Square className='h-4 w-4 text-slate-400' />}
                    </button>
                  </th>
                )}

                {columns.map(c => {
                  const isActive = sort?.key === c.accessor;
                  return (
                    <th
                      key={c.header + c.accessor}
                      className='whitespace-nowrap px-4 py-3.5 ltr:text-left rtl:text-right'>
                      <button
                        disabled={c.disableSort}
                        onClick={() => toggleSort(c.accessor, c.disableSort)}
                        className={[
                          'inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors duration-150',
                          c.disableSort
                            ? 'cursor-default text-slate-500'
                            : 'cursor-pointer text-slate-500 hover:text-[var(--color-primary-700)]',
                          isActive ? 'text-[var(--color-primary-700)]' : '',
                        ].join(' ')}>
                        {c.header}
                        {/* {!c.disableSort && <SortIcon active={isActive} dir={sort?.dir} />} */}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* ── Body ── */}
            <tbody>
              {loading ? (
                <SkeletonBlock columns={columns} count={skeletonRows} selectable={selectable} />
              ) : pageData.length === 0 ? (
                <tr>
                  <td className='px-4 py-12' colSpan={columns.length + (selectable ? 1 : 0)}>
                    {emptyState || <DefaultEmptyState />}
                  </td>
                </tr>
              ) : (
                pageData.map((row, idx) => {
                  const selected = selectedIds?.includes(row.id);
                  return (
                    <motion.tr
                      key={row.id ?? JSON.stringify(row)}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: idx * 0.018 }}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      role={onRowClick ? 'button' : undefined}
                      className={[
                        'group border-t border-slate-100 transition-colors duration-100',
                        selected
                          ? 'bg-[var(--color-primary-50)]'
                          : onRowClick
                            ? 'hover:bg-slate-50/70 cursor-pointer'
                            : '',
                      ].join(' ')}>

                      {selectable && (
                        <td className='px-4 py-3 whitespace-nowrap'>
                          <input
                            type='checkbox'
                            checked={selected}
                            onChange={() => onToggleRow?.(row.id)}
                            onClick={e => e.stopPropagation()}
                            aria-label={t('toggleRow')}
                            className='h-4 w-4 rounded border-slate-300 accent-[var(--color-primary-600)] transition-transform active:scale-90'
                          />
                        </td>
                      )}

                      {columns.map(c => (
                        <td
                          key={c.accessor}
                          className={[
                            'px-4 py-3 align-middle whitespace-nowrap text-slate-700',
                            'group-hover:text-slate-900 transition-colors duration-100',
                            c?.className || '',
                          ].join(' ')}>
                          {c.cell ? c.cell(row) : toDisplay(get(row, c.accessor))}
                        </td>
                      ))}
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination footer ── */}
        <AnimatePresence>
          {pagination && !loading && pageData.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='flex flex-col items-start justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3 sm:flex-row sm:items-center'>

              {/* Page info */}
              <p className='text-[11px] font-semibold uppercase tracking-widest text-slate-400'>
                {t('pageLabel', { page, total: totalPages })}
              </p>

              {/* Controls */}
              <div className='flex items-center gap-1'>
                <NavBtn
                  ariaLabel={t('first')}
                  disabled={page === 1}
                  onClick={() => setPage(1)}>
                  <ChevronsLeft className='h-3.5 w-3.5 rtl:rotate-180' />
                </NavBtn>

                <NavBtn
                  ariaLabel={t('prev')}
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <ChevronLeft className='h-3.5 w-3.5 rtl:rotate-180' />
                </NavBtn>

                <div className='mx-1 flex items-center gap-1'>
                  {buildPageItems(page, totalPages).map((it, idx) =>
                    it === '…'
                      ? <EllipsisDot key={`e-${idx}`} />
                      : <PageBtn key={it} active={it === page} onClick={() => setPage(it)}>{it}</PageBtn>
                  )}
                </div>

                <NavBtn
                  ariaLabel={t('next')}
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                  <ChevronRight className='h-3.5 w-3.5 rtl:rotate-180' />
                </NavBtn>

                <NavBtn
                  ariaLabel={t('last')}
                  disabled={page === totalPages}
                  onClick={() => setPage(totalPages)}>
                  <ChevronsRight className='h-3.5 w-3.5 rtl:rotate-180' />
                </NavBtn>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─────────────────────────── Pagination atoms ─────────────────────────── */

/** Arrow / skip navigation button */
function NavBtn({ children, disabled, onClick, ariaLabel }) {
  return (
    <button
      type='button'
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={[
        'inline-flex h-8 w-8 items-center justify-center rounded-lg border text-slate-500 transition-all duration-150',
        disabled
          ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
          : 'cursor-pointer border-slate-200 bg-white hover:border-[var(--color-primary-200)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-700)] active:scale-90',
      ].join(' ')}>
      {children}
    </button>
  );
}

/** Numbered page button */
function PageBtn({ active, children, onClick }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={[
        'inline-flex h-8 w-8 items-center justify-center rounded-lg border text-[13px] font-semibold transition-all duration-150 select-none',
        active
          ? 'border-transparent bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white shadow-md shadow-[var(--color-primary-200)] scale-105'
          : 'border-slate-200 bg-white text-slate-600 hover:border-[var(--color-primary-200)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-700)] active:scale-95',
      ].join(' ')}>
      {children}
    </button>
  );
}

/** Ellipsis separator */
function EllipsisDot() {
  return (
    <span className='inline-flex h-8 w-6 items-center justify-center text-[13px] font-medium text-slate-300 select-none'>
      ···
    </span>
  );
}

/* ─────────────────────────── Skeleton ─────────────────────────── */
function SkeletonBlock({ columns, count = 6, selectable }) {
  const widths = ['w-32', 'w-44', 'w-28', 'w-24', 'w-20', 'w-36', 'w-16', 'w-28'];
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className='border-t border-slate-100'>
          {selectable && (
            <td className='px-4 py-3.5'>
              <div className='h-4 w-4 rounded bg-slate-100 animate-pulse' />
            </td>
          )}
          {columns.map((_, ci) => (
            <td key={ci} className='px-4 py-3.5'>
              <div
                className={`h-3 rounded-full bg-slate-100 ${widths[ci % widths.length]} animate-pulse`}
                style={{ animationDelay: `${(i * columns.length + ci) * 30}ms` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ─────────────────────────── Empty state ─────────────────────────── */
function DefaultEmptyState() {
  const t = useTranslations('DataTable');
  return (
    <div className='flex flex-col items-center justify-center gap-3 py-14 text-center'>
      <div className='grid h-14 w-14 place-items-center rounded-lg bg-[var(--color-primary-50)]'>
        <Inbox className='h-6 w-6 text-[var(--color-primary-400)]' />
      </div>
      <div>
        <h3 className='text-sm font-semibold text-slate-800'>{t('noData')}</h3>
        <p className='mt-0.5 text-xs text-slate-400'>{t('adjustFiltersOrAdd')}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────── Utilities ─────────────────────────── */
function buildPageItems(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  const items = new Set([1, total, current]);
  if (current - 1 >= 1)     items.add(current - 1);
  if (current + 1 <= total) items.add(current + 1);

  while (items.size < 5) {
    const min = Math.min(...items);
    const max = Math.max(...items);
    if (min > 2)          items.add(min - 1);
    else if (max < total - 1) items.add(max + 1);
    else break;
  }

  const arr    = [...items].sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    if (i > 0 && arr[i] - arr[i - 1] > 1) result.push('…');
    result.push(arr[i]);
  }

  const numericCount = result.filter(x => x !== '…').length;
  if (total >= 3 && numericCount < 3)
    return [...new Set([1, 2, 3, '…', total])];

  return result;
}

function get(obj, path) {
  if (!path) return undefined;
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

function toDisplay(v) {
  if (v == null || v === '') return <span className='text-slate-300'>—</span>;
  return <TruncatedText value={v} max={18} />;
}