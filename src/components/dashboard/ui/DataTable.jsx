'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckSquare,
  Square,
  Inbox,
} from 'lucide-react';

const spring = { type: 'spring', stiffness: 360, damping: 30, mass: 0.7 };

function TruncatedText({ value, max = 15 }) {
  const locale = useLocale();
  if (value == null || value === '') {
    return <span className="text-slate-400">—</span>;
  }

  const text = String(value);
  if (text.length <= max) {
    return <span className="whitespace-nowrap">{text}</span>;
  }

  const visible = locale === 'ar' ? '…' + text.slice(0, max) : text.slice(0, max) + '…';

  return (
    <span className="group relative inline-flex whitespace-nowrap align-middle">
      {visible}
      <span
        className="pointer-events-none absolute left-0 top-[115%] z-20 hidden w-fit max-w-[200px] whitespace-normal break-words rounded-lg border bg-white px-3 py-2 text-xs text-slate-700 shadow-xl group-hover:block"
        style={{ borderColor: 'var(--color-primary-200)' }}
      >
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
  serverPagination = false,
  page: controlledPage,
  onPageChange,
  totalRows,
}) {
  const t = useTranslations('DataTable');

  const [internalPage, setInternalPage] = useState(1);
  const page = controlledPage ?? internalPage;
  const setPage = onPageChange ?? setInternalPage;

  useEffect(() => {
    if (controlledPage == null) setInternalPage(1);
  }, [data.length, itemsPerPage, controlledPage]);

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

  const totalPages = Math.max(
    1,
    serverPagination
      ? Math.ceil((totalRows ?? sorted.length) / itemsPerPage)
      : Math.ceil(sorted.length / itemsPerPage)
  );

  const start = (page - 1) * itemsPerPage;
  const pageData = pagination
    ? serverPagination
      ? sorted
      : sorted.slice(start, start + itemsPerPage)
    : sorted;

  const allPageIds = useMemo(() => (pageData || []).map(r => r.id).filter(Boolean), [pageData]);
  const allChecked = useMemo(
    () => allPageIds.length > 0 && allPageIds.every(id => selectedIds?.includes(id)),
    [allPageIds, selectedIds]
  );

  const toggleSort = (key, disableSort) => {
    if (disableSort || serverPagination) return;
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  return (
    <div className="w-full">
      <div
        className="overflow-hidden rounded-2xl   bg-white shadow-sm"
        style={{
          boxShadow:
            '0 1px 0 rgba(15, 23, 42, 0.04), 0 10px 24px rgba(15, 23, 42, 0.06)',
        }}
      >
 
        <div className="overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300">
          <table className="min-w-full text-sm">
            <thead className={`${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
              <tr
                className="backdrop-blur border-b border-slate-200"
                style={{
                  background:
                    'linear-gradient(180deg, var(--color-primary-50), rgba(255,255,255,0.9))',
                }}
              >
                {selectable && (
                  <th className="px-4 py-3 rtl:text-right text-left w-10">
                    <button
                      onClick={() => onToggleAll?.(allPageIds)}
                      className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors"
                      aria-label={t('toggleSelectAll')}
                      title={t('toggleSelectAll')}
                    >
                      {allChecked ? (
                        <CheckSquare
                          className="w-4 h-4"
                          style={{ color: 'var(--color-primary-600)' }}
                        />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                )}

                {columns.map(c => (
                  <th
                    key={c.header + c.accessor}
                    className="px-4 py-3 rtl:text-right text-left select-none font-semibold text-slate-800 whitespace-nowrap"
                  >
                    <button
                      className={`inline-flex items-center gap-1 transition-colors ${
                        c.disableSort
                          ? 'cursor-default'
                          : 'hover:text-slate-950 cursor-pointer'
                      }`}
                      onClick={() => toggleSort(c.accessor, c.disableSort)}
                      disabled={c.disableSort}
                      title={c.disableSort ? '' : t('sort')}
                      style={
                        sort?.key === c.accessor
                          ? { color: 'var(--color-primary-700)' }
                          : {}
                      }
                    >
                      <span>{c.header}</span>
                      {!c.disableSort && sort?.key === c.accessor && (
                        <span
                          className="text-xs"
                          style={{ color: 'var(--color-primary-700)' }}
                        >
                          {sort.dir === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
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
                  <td className="px-4 py-10" colSpan={columns.length + (selectable ? 1 : 0)}>
                    {emptyState || <DefaultEmptyState />}
                  </td>
                </tr>
              ) : (
                pageData.map((row, idx) => (
                  <motion.tr
                    key={row.id ?? JSON.stringify(row)}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: idx * 0.02 }}
                    className={`border-t border-slate-100 transition-colors ${
                      selectedIds?.includes(row.id) ? '' : 'hover:bg-slate-50'
                    }`}
                    style={{
                      backgroundColor: selectedIds?.includes(row.id)
                        ? 'var(--color-primary-50)'
                        : 'transparent',
                      cursor: onRowClick ? 'pointer' : 'default',
                    }}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    role={onRowClick ? 'button' : undefined}
                  >
                    {selectable && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedIds?.includes(row.id)}
                          onChange={() => onToggleRow?.(row.id)}
                          className="w-4 h-4 rounded border-slate-300 transition-colors"
                          style={{ accentColor: 'var(--color-primary-600)' }}
                          onClick={e => e.stopPropagation()}
                          aria-label={t('toggleRow')}
                          title={t('toggleRow')}
                        />
                      </td>
                    )}

                    {columns.map(c => (
                      <td
                        key={c.accessor}
                        className={`px-4 py-3 align-middle whitespace-nowrap text-slate-800 ${
                          c?.className || ''
                        }`}
                      >
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 border-t border-slate-200 text-sm bg-white">
            <div className="text-slate-600">{t('pageLabel', { page, total: totalPages })}</div>

            <div className="flex items-center gap-1">
              <PagerBtn ariaLabel={t('first')} disabled={page === 1} onClick={() => setPage(1)}>
                <ChevronsLeft className="w-4 h-4 rtl:rotate-[180deg]" />
              </PagerBtn>

              <PagerBtn
                ariaLabel={t('prev')}
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-[180deg]" />
              </PagerBtn>

              {/* Numbered pages (circles) */}
              <div className="mx-1 flex items-center gap-1">
                {buildPageItems(page, totalPages).map((it, idx) => {
                  if (it === '…') return <EllipsisPill key={`e-${idx}`} />;

                  const p = it;
                  return (
                    <PageNumberBtn
                      key={p}
                      active={p === page}
                      ariaLabel={`Page ${p}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </PageNumberBtn>
                  );
                })}
              </div>

              <PagerBtn
                ariaLabel={t('next')}
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="w-4 h-4 rtl:rotate-[180deg]" />
              </PagerBtn>

              <PagerBtn ariaLabel={t('last')} disabled={page === totalPages} onClick={() => setPage(totalPages)}>
                <ChevronsRight className="w-4 h-4 rtl:rotate-[180deg]" />
              </PagerBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- small helpers ---------- */

function buildPageItems(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  const items = new Set([1, total, current]);

  if (current - 1 >= 1) items.add(current - 1);
  if (current + 1 <= total) items.add(current + 1);

  while (items.size < 5) {
    const min = Math.min(...items);
    const max = Math.max(...items);
    if (min > 2) items.add(min - 1);
    else if (max < total - 1) items.add(max + 1);
    else break;
  }

  const sorted = [...items].sort((a, b) => a - b);

  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const prev = sorted[i - 1];
    if (i > 0 && p - prev > 1) result.push('…');
    result.push(p);
  }

  const numericCount = result.filter(x => x !== '…').length;
  if (total >= 3 && numericCount < 3) {
    return [1, 2, 3, '…', total].filter((v, idx, arr) => arr.indexOf(v) === idx);
  }

  return result;
}

function PageNumberBtn({ active, children, disabled, onClick, ariaLabel }) {
  const baseStyle = {
    borderColor: active ? 'var(--color-primary-300)' : '#e2e8f0',
    background: active
      ? 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))'
      : 'white',
    color: active ? 'white' : '#0f172a',
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="inline-flex items-center justify-center w-9 h-9 rounded-md border transition-all select-none"
      style={
        disabled
          ? {
              borderColor: '#e2e8f0',
              backgroundColor: '#f8fafc',
              color: '#cbd5e1',
              cursor: 'not-allowed',
            }
          : baseStyle
      }
      onMouseEnter={e => {
        if (!disabled && !active) {
          e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
          e.currentTarget.style.borderColor = 'var(--color-primary-200)';
        }
      }}
      onMouseLeave={e => {
        if (!disabled && !active) {
          e.currentTarget.style.backgroundColor = 'white';
          e.currentTarget.style.borderColor = '#e2e8f0';
        }
      }}
    >
      {children}
    </button>
  );
}

function EllipsisPill() {
  return (
    <span
      className="inline-flex items-center justify-center h-9 px-3 rounded-md border select-none"
      style={{
        borderColor: '#e2e8f0',
        backgroundColor: 'white',
        color: '#64748b',
      }}
    >
      …
    </span>
  );
}

function PagerBtn({ children, disabled, onClick, ariaLabel }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-all"
      style={
        disabled
          ? {
              borderColor: '#e2e8f0',
              backgroundColor: '#f8fafc',
              color: '#cbd5e1',
              cursor: 'not-allowed',
            }
          : {
              borderColor: '#e2e8f0',
              backgroundColor: 'white',
            }
      }
      onMouseEnter={e => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
          e.currentTarget.style.borderColor = 'var(--color-primary-200)';
        }
      }}
      onMouseLeave={e => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'white';
          e.currentTarget.style.borderColor = '#e2e8f0';
        }
      }}
      aria-disabled={disabled}
    >
      {children}
    </button>
  );
}

function SkeletonBlock({ columns, count = 6, selectable }) {
  const widths = [160, 220, 140, 120, 110, 200, 90, 130];
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="animate-pulse border-t border-slate-100">
          {selectable && (
            <td className="px-4 py-3 whitespace-nowrap">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: 'var(--color-primary-100)' }}
              />
            </td>
          )}
          {columns.map((_, ci) => (
            <td key={ci} className="px-4 py-3 whitespace-nowrap">
              <div
                className="h-3 rounded"
                style={{
                  width: widths[ci % widths.length],
                  background:
                    'linear-gradient(90deg, rgba(226,232,240,0.7), rgba(226,232,240,1), rgba(226,232,240,0.7))',
                  backgroundSize: '200% 100%',
                }}
              />
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
    <div className="text-center py-10">
      <div
        className="mx-auto w-14 h-14 rounded-xl grid place-items-center mb-3"
        style={{ backgroundColor: 'var(--color-primary-50)' }}
      >
        <Inbox className="w-6 h-6" style={{ color: 'var(--color-primary-400)' }} />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{t('noData')}</h3>
      <p className="text-sm text-slate-600 mt-1">{t('adjustFiltersOrAdd')}</p>
    </div>
  );
}

function get(obj, path) {
  if (!path) return undefined;
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

function toDisplay(v) {
  if (v == null || v === '') return <span className="text-slate-400">—</span>;
  return <TruncatedText value={v} max={15} />;
}
