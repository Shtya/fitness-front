// // components/UI/DataTable.js
// import { useState } from 'react';

// export default function DataTable({ columns, data, loading, pagination, itemsPerPage }) {
//   const [currentPage, setCurrentPage] = useState(1);
//   const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

//   // Pagination logic
//   const totalPages = Math.ceil(data.length / itemsPerPage);
//   const startIndex = (currentPage - 1) * itemsPerPage;
//   const paginatedData = pagination ? data.slice(startIndex, startIndex + itemsPerPage) : data;

//   // Sorting logic
//   const sortedData = [...paginatedData].sort((a, b) => {
//     if (!sortConfig.key) return 0;
    
//     if (a[sortConfig.key] < b[sortConfig.key]) {
//       return sortConfig.direction === 'asc' ? -1 : 1;
//     }
//     if (a[sortConfig.key] > b[sortConfig.key]) {
//       return sortConfig.direction === 'asc' ? 1 : -1;
//     }
//     return 0;
//   });

//   const handleSort = (key) => {
//     let direction = 'asc';
//     if (sortConfig.key === key && sortConfig.direction === 'asc') {
//       direction = 'desc';
//     }
//     setSortConfig({ key, direction });
//   };

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center py-8">
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="overflow-x-auto">
//       <table className="min-w-full divide-y divide-gray-200">
//         <thead className="bg-gray-50">
//           <tr>
//             {columns.map((column) => (
//               <th
//                 key={column.header}
//                 className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
//                 onClick={() => column.accessor && handleSort(column.accessor)}
//               >
//                 <div className="flex items-center">
//                   {column.header}
//                   {sortConfig.key === column.accessor && (
//                     <span className="ml-1">
//                       {sortConfig.direction === 'asc' ? '↑' : '↓'}
//                     </span>
//                   )}
//                 </div>
//               </th>
//             ))}
//           </tr>
//         </thead>
//         <tbody className="bg-white divide-y divide-gray-200">
//           {sortedData.map((row, rowIndex) => (
//             <tr key={rowIndex} className="hover:bg-gray-50">
//               {columns.map((column, colIndex) => (
//                 <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                   {column.cell ? column.cell(row) : row[column.accessor]}
//                 </td>
//               ))}
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       {pagination && data.length > 0 && (
//         <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
//           <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
//             <div>
//               <p className="text-sm text-gray-700">
//                 Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
//                 <span className="font-medium">
//                   {Math.min(startIndex + itemsPerPage, data.length)}
//                 </span>{' '}
//                 of <span className="font-medium">{data.length}</span> results
//               </p>
//             </div>
//             <div>
//               <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
//                 <button
//                   onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
//                   disabled={currentPage === 1}
//                   className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
//                 >
//                   Previous
//                 </button>
                
//                 {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
//                   <button
//                     key={page}
//                     onClick={() => setCurrentPage(page)}
//                     className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
//                       currentPage === page
//                         ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
//                         : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
//                     }`}
//                   >
//                     {page}
//                   </button>
//                 ))}
                
//                 <button
//                   onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
//                   disabled={currentPage === totalPages}
//                   className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
//                 >
//                   Next
//                 </button>
//               </nav>
//             </div>
//           </div>
//         </div>
//       )}

//       {data.length === 0 && (
//         <div className="text-center py-8 text-gray-500">
//           No data available
//         </div>
//       )}
//     </div>
//   );
// }


'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, CheckSquare, Square } from 'lucide-react';

const spring = { type: 'spring', stiffness: 360, damping: 30, mass: 0.7 };

/**
 * Columns shape:
 * [
 *   { header: 'Name', accessor: 'name', sortable: true },
 *   { header: 'Email', accessor: 'email' },
 *   { header: 'Status', accessor: 'status', cell: (row) => <StatusPill status={row.status} /> },
 *   { header: 'Actions', accessor: '_actions', cell: (row) => <button>Edit</button>, disableSort: true }
 * ]
 *
 * Props:
 * - columns: array (required)
 * - data: array (required)
 * - loading: boolean
 * - itemsPerPage: number (default 10)
 * - pagination: boolean (default true)
 * - emptyState: ReactNode (optional custom empty)
 * - skeletonRows: number (default 6)
 * - selectable: boolean (default false)
 * - selectedIds: number[] | string[] (controlled)
 * - onToggleRow(id), onToggleAll(ids): callbacks for selection
 * - onRowClick(row): optional
 * - stickyHeader: boolean (default true)
 * - initialSort: { key: 'name', dir: 'asc' } (optional)
 */
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
}) {
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

  const allPageIds = useMemo(() => (pageData || []).map((r) => r.id), [pageData]);
  const allChecked = selectable && allPageIds.length > 0 && allPageIds.every((id) => selectedIds?.includes(id));

  const toggleSort = (key, disableSort) => {
    if (disableSort) return;
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null; // turn off sort on third click
    });
  };

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
            <tr className="bg-slate-50 text-slate-600">
              {selectable && (
                <th className="px-4 py-3 text-left w-10">
                  <button
                    onClick={() => onToggleAll?.(allPageIds)}
                    className="inline-flex items-center gap-2 text-slate-700"
                    aria-label="Toggle select all"
                  >
                    {allChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
              )}
              {columns.map((c) => {
                const active = sort?.key === c.accessor;
                return (
                  <th
                    key={c.header + c.accessor}
                    className="px-4 py-3 text-left select-none"
                  >
                    <button
                      className={`inline-flex items-center gap-1 ${c.disableSort ? 'cursor-default' : 'cursor-pointer'} hover:text-slate-900`}
                      onClick={() => toggleSort(c.accessor, c.disableSort)}
                      title={c.disableSort ? '' : 'Sort'}
                    >
                      <span className="font-medium">{c.header}</span>
                      {!c.disableSort && (
                        <ArrowUpDown className={`w-3.5 h-3.5 transition ${active ? 'opacity-100' : 'opacity-40'}`} />
                      )}
                      {active && (
                        <span className="sr-only">
                          {sort.dir === 'asc' ? 'ascending' : 'descending'}
                        </span>
                      )}
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
                <td colSpan={columns.length + (selectable ? 1 : 0)}>
                  {emptyState || <DefaultEmptyState />}
                </td>
              </tr>
            ) : (
              pageData.map((row) => (
                <motion.tr
                  key={row.id ?? JSON.stringify(row)}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={spring}
                  className="border-t border-slate-100 hover:bg-slate-50/50"
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  role={onRowClick ? 'button' : undefined}
                >
                  {selectable && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds?.includes(row.id)}
                        onChange={() => onToggleRow?.(row.id)}
                        className="w-4 h-4"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.accessor} className="px-4 py-3 align-middle">
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
        <div className="flex items-center justify-between p-3 border-t border-slate-100 text-sm">
          <div className="text-slate-600">
            Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
          </div>
          <div className="flex items-center gap-1">
            <PagerBtn disabled={page === 1} onClick={() => setPage(1)}><ChevronsLeft className="w-4 h-4" /></PagerBtn>
            <PagerBtn disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="w-4 h-4" /></PagerBtn>
            <PagerBtn disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight className="w-4 h-4" /></PagerBtn>
            <PagerBtn disabled={page === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight className="w-4 h-4" /></PagerBtn>
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
        <tr key={i} className="animate-pulse">
          {selectable && (
            <td className="px-4 py-3">
              <div className="w-4 h-4 bg-slate-200 rounded" />
            </td>
          )}
          {columns.map((_, ci) => (
            <td key={ci} className="px-4 py-3">
              <div className="h-3 rounded bg-slate-200" style={{ width: widths[ci % widths.length] }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function DefaultEmptyState() {
  return (
    <div className="text-center py-16">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100" />
      <h3 className="mt-4 text-lg font-semibold">No data</h3>
      <p className="text-sm text-slate-600 mt-1">Adjust filters or add new records.</p>
    </div>
  );
}

function get(obj, path) {
  if (!path) return undefined;
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}
function toDisplay(v) {
  if (v == null || v === '') return <span className="text-slate-400">—</span>;
  return String(v);
}
