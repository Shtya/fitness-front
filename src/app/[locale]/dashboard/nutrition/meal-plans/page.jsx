/* 
  Meal Plans page – enhanced to match Exercises page design
  - Consistent styling with Exercises page
  - Performance optimizations
  - UI pattern alignment
*/

'use client';

import { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, Plus, LayoutGrid, Rows, Eye, PencilLine, Trash2, CheckCircle2, Settings, Clock, ChevronUp, ChevronDown, Users as UsersIcon, X, Layers, Search, Tag, Calendar, RefreshCcw } from 'lucide-react';

import api from '@/utils/axios';
import { Modal, StatCard, TabsPill } from '@/components/dashboard/ui/UI';
import Button from '@/components/atoms/Button';
import Select from '@/components/atoms/Select';
import { useValues } from '@/context/GlobalContext';
import { Notification } from '@/config/Notification';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import { PrettyPagination } from '@/components/dashboard/ui/Pagination';

const spring = { type: 'spring', stiffness: 360, damping: 30, mass: 0.7 };

/* -------------------------------- Helpers -------------------------------- */
const useDebounced = (value, delay = 350) => {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return deb;
};

const numOr = (v, d = 0) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : d;
};

const fieldIsNumber = field => ['calories', 'protein', 'carbs', 'fat', 'quantity', 'orderIndex'].includes(field);

/* ---------------------------- Memoized Components --------------------------- */
const Chip = memo(({ children }) => <span className='inline-flex items-center rounded-lg bg-slate-100 text-slate-700 text-[11px] px-2 py-1 mr-1 mb-1'>{children}</span>);

const IconBtn = memo(({ title, onClick, danger, children }) => (
  <button
    type='button'
    title={title}
    onClick={onClick}
    aria-label={title}
    className={`size-7 grid place-content-center rounded-lg border shadow-sm active:scale-95 transition
      ${danger ? 'border-rose-200 bg-white hover:bg-rose-50 text-rose-600' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'}`}>
    {children}
  </button>
));

const StatPill = memo(({ label, value }) => (
  <span className='inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700'>
    <span className='font-medium text-slate-900'>{label}</span>
    <span className='opacity-80'>{value}</span>
  </span>
));

/* =============================== PAGE ROOT =============================== */
export default function MealPlansPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [searchText, setSearchText] = useState('');
  const debounced = useDebounced(searchText, 350);

  const [view, setView] = useState('grid');
  const [preview, setPreview] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [assignOpen, setAssignOpen] = useState(null);

  // KPIs
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // People (clients/coaches)
  const { usersByRole, fetchUsers } = useValues();
  useEffect(() => {
    fetchUsers('client');
    fetchUsers('coach');
  }, [fetchUsers]);
  const optionsClient = usersByRole['client'] || [];

  const reqId = useRef(0);
  const abortControllerRef = useRef(null);

  const fetchList = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setErr(null);
    setLoading(true);

    const myId = ++reqId.current;
    try {
      const params = { page, limit: perPage, sortBy, sortOrder };
      if (debounced) params.search = debounced;

      const res = await api.get('/nutrition/meal-plans', {
        params,
        signal: abortControllerRef.current.signal,
      });
      const data = res.data || {};

      let records = [];
      let totalRecords = 0;
      let serverPerPage = perPage;

      if (Array.isArray(data.records)) {
        records = data.records;
        totalRecords = Number(data.total_records || data.records.length || 0);
        serverPerPage = Number(data.per_page || perPage);
      } else if (Array.isArray(data)) {
        records = data;
        totalRecords = data.length;
      } else if (Array.isArray(data.items)) {
        records = data.items;
        totalRecords = Number(data.total || data.items.length || 0);
        serverPerPage = Number(data.limit || perPage);
      }

      if (myId !== reqId.current) return;
      setTotal(totalRecords);
      setPerPage(serverPerPage);
      setItems(records);
    } catch (e) {
      if (e.name === 'CanceledError') return;
      if (myId !== reqId.current) return;
      setErr(e?.response?.data?.message || 'Failed to load meal plans');
    } finally {
      if (myId === reqId.current) setLoading(false);
    }
  }, [page, debounced, sortBy, sortOrder, perPage]);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const params = {};
      if (debounced) params.search = debounced;
      const res = await api.get('/nutrition/meal-plans/stats', { params });
      setStats(res.data?.totals || {});
    } catch {
      // ignore
    } finally {
      setLoadingStats(false);
    }
  }, [debounced]);

  // Reset to page 1 on search/sort changes
  useEffect(() => {
    setPage(1);
  }, [debounced, sortBy, sortOrder, perPage]);

  // Data fetching
  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const toggleSort = useCallback(
    field => {
      if (sortBy === field) {
        setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
      } else {
        setSortBy(field);
        setSortOrder('ASC');
      }
    },
    [sortBy],
  );

  const getOne = async id => (await api.get(`/nutrition/meal-plans/${id}`)).data;

  /* ----------------------------- CRUD Handlers ---------------------------- */
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const askDelete = useCallback(id => {
    setDeleteId(id);
    setDeleteOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/nutrition/meal-plans/${deleteId}`);
      setItems(arr => arr.filter(x => x.id !== deleteId));
      setTotal(t => Math.max(0, t - 1));
      Notification('Meal plan deleted successfully', 'success');
    } catch (e) {
      Notification(e?.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setDeleteId(null);
      setDeleteLoading(false);
      setDeleteOpen(false);
    }
  }, [deleteId]);

  const createOrUpdate = async ({ id, payload }) => {
    const url = id ? `/nutrition/meal-plans/${id}` : '/nutrition/meal-plans';
    const method = id ? 'put' : 'post';
    const res = await api[method](url, payload);
    return res.data;
  };

  const openPreview = async plan => {
    try {
      setPreview(await getOne(plan.id));
    } catch {
      setPreview(plan);
    }
  };

  const openEdit = async plan => {
    try {
      setEditRow(await getOne(plan.id));
    } catch {
      setEditRow(plan);
    }
  };

  const openAssign = plan => setAssignOpen(plan);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / Math.max(1, perPage))), [total, perPage]);

  return (
    <div className='space-y-6'>
      {/* Header / Stats - Matching Exercises page */}
      <GradientStatsHeader onClick={() => setAddOpen(true)} btnName={'New Meal Plan'} title='Meal Plans' desc='Create nutrition plans and assign to clients.' loadingStats={loadingStats}>
        <StatCard className=' ' icon={Layers} title='Total Plans' value={stats?.total || 0} />
        <StatCard className=' ' icon={CheckCircle2} title='Active Plans' value={stats?.activePlans || 0} />
        <StatCard className=' ' icon={Calendar} title='Total Days' value={stats?.totalDays || 0} />
        <StatCard className=' ' icon={RefreshCcw} title='Total Assignments' value={stats?.totalAssignments || 0} />
      </GradientStatsHeader>

      {/* Filters + search - Matching Exercises page */}
      <div className='relative '>
        <div className='flex items-center justify-between gap-2 flex-wrap'>
          {/* Search */}
          <div className='relative flex-1 max-w-[240px] sm:min-w-[260px]'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
            <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder='Search meal plans…' className={['h-11 w-full pl-10 pr-10 rounded-lg', 'border border-slate-200 bg-white/90 text-slate-900', 'shadow-sm hover:shadow transition', 'focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200/40'].join(' ')} />
            {!!searchText && (
              <button type='button' onClick={() => setSearchText('')} className='absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100' aria-label='Clear search' title='Clear'>
                <X className='w-4 h-4' />
              </button>
            )}
          </div>

          <div className='flex items-center gap-2'>
            {/* View toggle */}
            <button onClick={() => setView(v => (v === 'grid' ? 'list' : 'grid'))} className={['group inline-flex items-center gap-2 rounded-lg px-3.5 h-11', 'border border-slate-200 bg-white/90 text-slate-800', 'shadow-sm hover:shadow transition active:scale-[.98]', 'focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200/40'].join(' ')} aria-pressed={view !== 'grid'} title={view === 'grid' ? 'Switch to list view' : 'Switch to grid view'}>
              <span className='relative inline-block w-5 h-5'>
                <AnimatePresence mode='wait' initial={false}>
                  {view === 'grid' ? (
                    <motion.span key='rows' className='absolute inset-0' initial={{ y: 8, opacity: 0, rotate: -8, scale: 0.92 }} animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }} exit={{ y: -8, opacity: 0, rotate: 8, scale: 0.92 }} transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.6 }}>
                      <Rows className='w-5 h-5 text-slate-700' />
                    </motion.span>
                  ) : (
                    <motion.span key='grid' className='absolute inset-0' initial={{ y: 8, opacity: 0, rotate: -8, scale: 0.92 }} animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }} exit={{ y: -8, opacity: 0, rotate: 8, scale: 0.92 }} transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.6 }}>
                      <LayoutGrid className='w-5 h-5 text-slate-700' />
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <motion.span key={view} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -6, opacity: 0 }} transition={{ duration: 0.16 }} className='hidden sm:inline text-sm'>
                {view === 'grid' ? 'List view' : 'Grid view'}
              </motion.span>
            </button>

            {/* Per page */}
            <div className='min-w-[130px]'>
              <Select
                className='!w-full'
                placeholder='Per page'
                options={[
                  { id: 8, label: 8 },
                  { id: 12, label: 12 },
                  { id: 20, label: 20 },
                  { id: 30, label: 30 },
                ]}
                value={perPage}
                onChange={n => setPerPage(Number(n))}
              />
            </div>

            {/* Sort newest */}
            <button onClick={() => toggleSort('created_at')} className={['inline-flex items-center gap-2 rounded-lg px-3 h-11 font-medium transition-all duration-300', 'border border-slate-200 bg-white/95 text-slate-800 shadow-sm', 'hover:shadow-md hover:bg-slate-50 active:scale-[.97]', 'focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200/40'].join(' ')}>
              <Clock size={18} />
              <span className='text-sm tracking-wide'>{sortBy === 'created_at' ? (sortOrder === 'ASC' ? 'Oldest First' : 'Newest First') : 'Sort by Date'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Errors */}
      {err ? <div className='p-3 rounded-lg bg-red-50 text-red-700 border border-red-100'>{err}</div> : null}

      {/* Content */}
      {view === 'grid' ? <GridView loading={loading} items={items} onPreview={openPreview} onEdit={openEdit} onDelete={askDelete} onAssign={openAssign} /> : <ListView loading={loading} items={items} onPreview={openPreview} onEdit={openEdit} onDelete={askDelete} onAssign={openAssign} />}

      <PrettyPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Preview */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || 'Meal Plan Preview'} maxW='max-w-4xl'>
        {preview && <MealPlanPreview plan={preview} />}
      </Modal>

      {/* New Meal Plan */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title='Create Meal Plan' maxW='max-w-3xl'>
        <MealPlanForm
          onSubmit={async payload => {
            try {
              const saved = await createOrUpdate({ payload });
              setItems(arr => [saved, ...arr]);
              setTotal(t => t + 1);
              setAddOpen(false);
              Notification('Meal plan created', 'success');
            } catch (e) {
              Notification(e?.response?.data?.message || 'Create failed', 'error');
            }
          }}
        />
      </Modal>

      {/* Edit */}
      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Edit: ${editRow?.name || ''}`} maxW='max-w-3xl'>
        {editRow && (
          <MealPlanForm
            initial={editRow}
            onSubmit={async payload => {
              try {
                const saved = await createOrUpdate({ id: editRow.id, payload });
                setItems(arr => arr.map(p => (p.id === editRow.id ? saved : p)));
                setEditRow(null);
                Notification('Meal plan updated', 'success');
              } catch (e) {
                Notification(e?.response?.data?.message || 'Update failed', 'error');
              }
            }}
          />
        )}
      </Modal>

      {/* Assign */}
      <Modal open={!!assignOpen} onClose={() => setAssignOpen(null)} title={`Assign: ${assignOpen?.name || ''}`} maxW='max-w-md'>
        {assignOpen && (
          <AssignMealPlanForm
            optionsClient={optionsClient}
            planId={assignOpen.id}
            onClose={() => setAssignOpen(null)}
            onAssigned={() => {
              setAssignOpen(null);
              Notification('Meal plan assigned successfully', 'success');
            }}
          />
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        loading={deleteLoading}
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteId(null);
        }}
        title='Delete meal plan?'
        message='This action cannot be undone.'
        confirmText='Delete'
        onConfirm={handleDelete}
      />
    </div>
  );
}

/* ---------------------------- Subcomponents ---------------------------- */
const ConfirmDialog = memo(({ open, onClose, loading, title = 'Are you sure?', message = '', onConfirm, confirmText = 'Confirm' }) => {
  return (
    <Modal open={open} onClose={onClose} title={title} maxW='max-w-md'>
      <div className='space-y-4'>
        {message ? <p className='text-sm text-slate-600'>{message}</p> : null}
        <div className='flex items-center justify-end gap-2'>
          <Button
            name={confirmText}
            loading={loading}
            color='danger'
            className='!w-fit'
            onClick={() => {
              onConfirm?.();
              onClose?.();
            }}
          />
        </div>
      </div>
    </Modal>
  );
});

/* ================================ GRID VIEW ================================ */
const GridView = memo(({ loading, items, onPreview, onEdit, onDelete, onAssign }) => {
  if (loading) {
    return (
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className='relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
            <div className='aspect-video w-full overflow-hidden'>
              <div className='h-full w-full shimmer' />
            </div>
            <div className='p-4'>
              <div className='h-4 w-4/5 shimmer rounded mb-2' />
              <div className='h-3 w-2/3 shimmer rounded mb-2' />
              <div className='h-3 w-1/2 shimmer rounded' />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className='rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm'>
        <div className='mx-auto w-16 h-16 rounded-lg bg-slate-100 grid place-content-center'>
          <Utensils className='w-8 h-8 text-slate-500' />
        </div>
        <h3 className='mt-4 text-lg font-semibold text-slate-800'>No meal plans found</h3>
        <p className='text-sm text-slate-600 mt-1'>Try a different search or create a new meal plan.</p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
      {items.map(p => {
        const dayCount = p?.days?.length || 0;
        const totalFoods = p?.days?.reduce((sum, day) => sum + (day.foods?.length || 0), 0) || 0;

        return (
          <motion.div key={p.id} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring} className='group relative overflow-hidden rounded-lg bg-white border border-slate-200 shadow-sm hover:shadow-md'>
            {/* premium gradient ring on hover */}
            <div className='pointer-events-none absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300' style={{ WebkitMaskImage: 'linear-gradient(#000 60%, transparent)' }}>
              <div className='absolute inset-0 rounded-lg ring-1 ring-transparent' style={{ background: 'linear-gradient(90deg, rgba(99,102,241,.18), rgba(16,185,129,.18))', maskImage: 'linear-gradient(black, transparent 70%)' }} />
            </div>

            {/* Header */}
            <div className='p-4 space-y-2'>
              {/* Title row */}
              <div className='flex items-start justify-between gap-2'>
                <div className='font-semibold text-slate-800 leading-5 line-clamp-1' title={p.name}>
                  {p.name}
                </div>
                <div className='flex gap-1 opacity-0 group-hover:opacity-100 transition'>
                  <IconBtn title='Preview' onClick={() => onPreview?.(p)}>
                    <Eye className='w-3.5 h-3.5 text-slate-700' />
                  </IconBtn>
                  <IconBtn title='Edit' onClick={() => onEdit?.(p)}>
                    <PencilLine className='w-3.5 h-3.5 text-indigo-600' />
                  </IconBtn>
                  <IconBtn title='Delete' onClick={() => onDelete?.(p.id)} danger>
                    <Trash2 className='w-3.5 h-3.5' />
                  </IconBtn>
                </div>
              </div>

              {/* Status badge */}
              <span className={`inline-flex items-center gap-1 rounded-lg text-[11px] px-2 py-1 shadow ${p.isActive ? 'bg-emerald-600/90 text-white' : 'bg-slate-100 text-slate-700'}`}>{p.isActive ? 'Active' : 'Inactive'}</span>

              {/* Description */}
              {p.desc ? <p className='text-sm text-slate-600 line-clamp-2'>{p.desc}</p> : null}

              {/* Meta row */}
              <div className='flex flex-wrap items-center gap-2 pt-1'>
                <span className='text-[11px] rounded-lg border border-slate-200 px-2 py-1 text-slate-600'>
                  Days <span className='font-medium'> / {dayCount}</span>
                </span>
                <span className='text-[11px] rounded-lg border border-slate-200 px-2 py-1 text-slate-600'>
                  Foods <span className='font-medium'>{totalFoods}</span>
                </span>
              </div>

              {/* Days */}
              {dayCount > 0 && (
                <div className='flex flex-wrap gap-1'>
                  {p.days.slice(0, 3).map(d => (
                    <span key={d.id} className='px-2 py-0.5 text-[11px] rounded-full bg-slate-100 text-slate-700 border border-slate-200'>
                      {String(d.name || d.day).toLowerCase()}
                    </span>
                  ))}
                  {dayCount > 3 && <span className='px-2 py-0.5 text-[11px] rounded-full bg-slate-100 text-slate-700 border border-slate-200'>+{dayCount - 3} more</span>}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className='px-4 pb-4'>
              <Button onClick={() => onAssign?.(p)} color='outline' className='!w-full' icon={<UsersIcon className='w-4 h-4' />} name='Assign' />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});

/* ================================ LIST VIEW ================================ */
const ListView = memo(({ loading, items, onPreview, onEdit, onDelete, onAssign }) => {
  if (loading) {
    return (
      <div className='rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 shadow-sm'>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className='p-4 flex items-center justify-between gap-3'>
            <div className='flex items-center gap-3 w-full'>
              <div className='w-16 h-10 rounded-lg shimmer' />
              <div className='flex-1'>
                <div className='h-4 shimmer w-40 mb-2 rounded' />
                <div className='h-3 shimmer w-24 rounded' />
              </div>
            </div>
            <div className='w-24 h-6 shimmer rounded' />
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className='rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm'>
        <div className='mx-auto w-16 h-16 rounded-lg bg-slate-100 grid place-content-center'>
          <Utensils className='w-8 h-8 text-slate-500' />
        </div>
        <h3 className='mt-4 text-lg font-semibold text-slate-800'>No meal plans found</h3>
        <p className='text-sm text-slate-600 mt-1'>Try a different search or create a new meal plan.</p>
      </div>
    );
  }

  return (
    <div className='rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 shadow-sm'>
      {items.map(p => {
        const dayCount = p?.days?.length || 0;
        const totalFoods = p?.days?.reduce((sum, day) => sum + (day.foods?.length || 0), 0) || 0;

        return (
          <div key={p.id} className='p-3 sm:p-4 flex items-center justify-between gap-3'>
            {/* Left: content */}
            <div className='flex items-start gap-3 min-w-0 flex-1'>
              {/* Icon */}
              <div className='w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white grid place-content-center shrink-0'>
                <Utensils className='w-5 h-5' />
              </div>

              {/* Text area */}
              <div className='min-w-0 flex-1'>
                {/* Title + status */}
                <div className='flex items-center gap-2 min-w-0'>
                  <div className='font-medium text-slate-800 truncate'>{p.name}</div>
                  <span className={`inline-flex items-center gap-1 rounded-lg text-[11px] px-2 py-0.5 shrink-0 ${p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{p.isActive ? 'Active' : 'Inactive'}</span>
                </div>

                {/* Details one-liner */}
                {p.desc ? <div className='text-[12px] text-slate-600 line-clamp-1 mt-1'>{p.desc}</div> : null}

                {/* Meta */}
                <div className='mt-1 text-[11px] text-slate-500'>
                  {dayCount} day{dayCount === 1 ? '' : 's'} · {totalFoods} food{totalFoods === 1 ? '' : 's'}
                </div>
              </div>
            </div>

            {/* Right: compact actions */}
            <div className='flex items-center gap-1 shrink-0'>
              <Button onClick={() => onAssign?.(p)} color='outline' className='!px-2.5 !py-1.5' icon={<UsersIcon className='w-4 h-4' />} name='Assign' />
              <IconBtn title='Preview' onClick={() => onPreview?.(p)}>
                <Eye className='w-3.5 h-3.5' />
              </IconBtn>
              <IconBtn title='Edit' onClick={() => onEdit?.(p)}>
                <PencilLine className='w-3.5 h-3.5 text-indigo-600' />
              </IconBtn>
              <IconBtn title='Delete' onClick={() => onDelete?.(p.id)} danger>
                <Trash2 className='w-3.5 h-3.5' />
              </IconBtn>
            </div>
          </div>
        );
      })}
    </div>
  );
});

/* ================================ PREVIEW ================================ */
const MealPlanPreview = memo(({ plan }) => {
  const [assignees, setAssignees] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get(`/nutrition/meal-plans/${plan.id}/assignees`);
        if (mounted) setAssignees(res.data || []);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, [plan.id]);

  const calculateNutrition = foods => {
    return (
      foods?.reduce(
        (total, item) => {
          const q = Number(item.quantity || 0);
          const factor = q / 100;
          return {
            calories: total.calories + Number(item.calories || 0) * factor,
            protein: total.protein + Number(item.protein || 0) * factor,
            carbs: total.carbs + Number(item.carbs || 0) * factor,
            fat: total.fat + Number(item.fat || 0) * factor,
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ) || { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${plan.isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-800 border border-slate-200'}`}>{plan.isActive ? 'Active' : 'Inactive'}</span>
      </div>

      {plan.desc ? <div className='text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200'>{plan.desc}</div> : null}

      <div className='space-y-4'>
        {(plan.days || []).map((d, idx) => {
          const dayNutrition = calculateNutrition(d.foods || []);

          return (
            <div key={d.id || idx} className='rounded-lg border border-slate-200 bg-white'>
              <div className='px-4 py-3 border-b border-slate-100 flex items-center justify-between'>
                <div className='font-semibold text-slate-800'>{d.name}</div>
                <div className='text-xs text-slate-500'>{String(d.day || '').toLowerCase()}</div>
              </div>

              {/* Nutrition Summary */}
              {d.foods?.length > 0 && (
                <div className='p-4 border-b border-slate-100'>
                  <div className='grid grid-cols-4 gap-3 text-sm'>
                    <div className='text-center p-2 rounded-lg bg-blue-50 border border-blue-200'>
                      <div className='font-semibold text-blue-700'>{Math.round(dayNutrition.calories)}</div>
                      <div className='text-blue-600 text-xs'>kcal</div>
                    </div>
                    <div className='text-center p-2 rounded-lg bg-green-50 border border-green-200'>
                      <div className='font-semibold text-green-700'>{dayNutrition.protein.toFixed(1)}g</div>
                      <div className='text-green-600 text-xs'>Protein</div>
                    </div>
                    <div className='text-center p-2 rounded-lg bg-yellow-50 border border-yellow-200'>
                      <div className='font-semibold text-yellow-700'>{dayNutrition.carbs.toFixed(1)}g</div>
                      <div className='text-yellow-600 text-xs'>Carbs</div>
                    </div>
                    <div className='text-center p-2 rounded-lg bg-red-50 border border-red-200'>
                      <div className='font-semibold text-red-700'>{dayNutrition.fat.toFixed(1)}g</div>
                      <div className='text-red-600 text-xs'>Fat</div>
                    </div>
                  </div>
                </div>
              )}

              <div className='p-4'>
                {(d.foods || []).length ? (
                  <ul className='space-y-2'>
                    {d.foods.map((foodItem, i) => {
                      const q = Number(foodItem.quantity || 0);
                      const factor = q / 100;
                      return (
                        <li key={foodItem.id || i} className='flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200'>
                          <div className='flex-1'>
                            <div className='font-medium text-slate-800'>{foodItem.name}</div>
                            <div className='text-xs text-slate-600 mt-1'>
                              {q}
                              {foodItem.unit || 'g'} · {String(foodItem.mealType || '').toUpperCase()}
                              {foodItem.category ? ` · ${foodItem.category}` : ''}
                            </div>
                          </div>
                          <div className='text-right text-sm text-slate-700'>
                            <div className='font-medium'>{Math.round((foodItem.calories || 0) * factor)} kcal</div>
                            <div className='text-xs text-slate-500'>P: {(Number(foodItem.protein || 0) * factor).toFixed(1)}g</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className='text-sm text-slate-500 text-center py-4'>No foods yet</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <div className='text-xs font-semibold text-slate-500 mb-2'>Assignees</div>
        {assignees === null ? (
          <div className='h-8 rounded shimmer w-1/2' />
        ) : assignees.length ? (
          <div className='flex flex-wrap gap-1'>
            {assignees.map(a => (
              <span key={a.id} className='inline-flex items-center rounded-lg bg-indigo-100 text-indigo-700 text-[11px] px-2 py-1 border border-indigo-200'>
                {a?.athlete?.name || a?.athlete?.email || a?.athlete?.id}
              </span>
            ))}
          </div>
        ) : (
          <div className='text-xs text-slate-400'>No assignees</div>
        )}
      </div>

      <div className='text-[11px] text-slate-500 border-t border-slate-100 pt-3'>
        Created: {plan.created_at ? new Date(plan.created_at).toLocaleString() : '—'} · Updated: {plan.updated_at ? new Date(plan.updated_at).toLocaleString() : '—'}
      </div>
    </div>
  );
});

/* ================================ ASSIGN ================================= */
const AssignMealPlanForm = memo(({ planId, onClose, onAssigned, optionsClient }) => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const addUser = userId => {
    if (!userId) return;
    if (selectedUsers.some(u => u.id === userId)) return;
    const user = optionsClient.find(u => u.id === userId);
    if (!user) return;
    setSelectedUsers(prev => [...prev, user]);
  };

  const removeUser = userId => setSelectedUsers(prev => prev.filter(u => u.id !== userId));

  const submit = async e => {
    e.preventDefault();
    if (!selectedUsers.length) return;
    setSubmitting(true);
    try {
      // single assign first; you can switch to bulk if needed
      const first = selectedUsers[0];
      await api.post(`/nutrition/meal-plans/${planId}/assign`, { userId: first.id });
      onAssigned?.();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to assign meal plan';
      Notification(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className='space-y-4'>
      <div>
        <label className='text-sm font-medium text-slate-700 mb-2 block'>Select Users</label>
        <Select placeholder='Search and select users…' options={optionsClient.filter(o => !selectedUsers.some(u => u.id === o.id))} value={null} onChange={addUser} searchable={true} />
      </div>

      {selectedUsers.length > 0 && (
        <div className='flex flex-wrap gap-2'>
          {selectedUsers.map(user => (
            <span key={user.id} className='inline-flex items-center gap-2 rounded-lg bg-indigo-100 text-indigo-700 text-sm px-3 py-1.5 border border-indigo-200'>
              {user.label}
              <button type='button' onClick={() => removeUser(user.id)} className='hover:text-indigo-900 transition-colors' aria-label='Remove user'>
                <X className='w-3 h-3' />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className='flex items-center justify-end gap-2 pt-2'>
        <Button onClick={onClose} type='button' color='outline' name='Cancel' />
        <Button disabled={submitting || selectedUsers.length === 0} type='submit' color='primary' name={submitting ? 'Assigning…' : 'Assign'} loading={submitting} />
      </div>
    </form>
  );
});

/* ============================ MEAL PLAN FORM ============================ */
const MealPlanForm = memo(({ initial, onSubmit }) => {
  const [name, setName] = useState(initial?.name || '');
  const [desc, setDesc] = useState(initial?.desc || '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [days, setDays] = useState(
    (initial?.days || []).map(d => ({
      id: d.id || `day-${Math.random().toString(36).slice(2)}`,
      day: d.day || 'monday',
      name: d.name || '',
      foods: (d.foods || []).map(f => ({
        id: f.id || `food-${Math.random().toString(36).slice(2)}`,
        name: f.name || '',
        category: f.category || '',
        calories: numOr(f.calories, 0),
        protein: numOr(f.protein, 0),
        carbs: numOr(f.carbs, 0),
        fat: numOr(f.fat, 0),
        unit: f.unit || 'g',
        quantity: numOr(f.quantity, 100),
        mealType: (f.mealType || 'lunch').toLowerCase(),
        orderIndex: numOr(f.orderIndex, 0),
      })),
    })),
  );

  useEffect(() => {
    setName(initial?.name || '');
    setDesc(initial?.desc || '');
    setIsActive(initial?.isActive ?? true);
    setDays(
      (initial?.days || []).map(d => ({
        id: d.id || `day-${Math.random().toString(36).slice(2)}`,
        day: d.day || 'monday',
        name: d.name || '',
        foods: (d.foods || []).map(f => ({
          id: f.id || `food-${Math.random().toString(36).slice(2)}`,
          name: f.name || '',
          category: f.category || '',
          calories: numOr(f.calories, 0),
          protein: numOr(f.protein, 0),
          carbs: numOr(f.carbs, 0),
          fat: numOr(f.fat, 0),
          unit: f.unit || 'g',
          quantity: numOr(f.quantity, 100),
          mealType: (f.mealType || 'lunch').toLowerCase(),
          orderIndex: numOr(f.orderIndex, 0),
        })),
      })),
    );
  }, [initial]);

  const DAYS = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' },
  ];

  const MEAL_TYPES = [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snack', label: 'Snack' },
  ];

  const addDay = () => {
    const newDay = {
      id: `day-${Date.now()}`,
      day: 'monday',
      name: 'New Day',
      foods: [],
    };
    setDays(prev => [...prev, newDay]);
  };

  const removeDay = dayIndex => {
    setDays(prev => prev.filter((_, i) => i !== dayIndex));
  };

  const updateDay = (dayIndex, field, value) => {
    setDays(prev => prev.map((day, i) => (i === dayIndex ? { ...day, [field]: value } : day)));
  };

  const addFoodToDay = dayIndex => {
    const newFood = {
      id: `food-${Date.now()}`,
      name: '',
      category: '',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      unit: 'g',
      quantity: 100,
      mealType: 'lunch',
      orderIndex: days[dayIndex]?.foods?.length || 0,
    };
    setDays(prev => prev.map((day, i) => (i === dayIndex ? { ...day, foods: [...day.foods, newFood] } : day)));
  };

  const removeFoodFromDay = (dayIndex, foodIndex) => {
    setDays(prev => prev.map((day, i) => (i === dayIndex ? { ...day, foods: day.foods.filter((_, j) => j !== foodIndex) } : day)));
  };

  const updateFoodInDay = (dayIndex, foodIndex, field, value) => {
    setDays(prev =>
      prev.map((day, i) =>
        i === dayIndex
          ? {
              ...day,
              foods: day.foods.map((food, j) => (j === foodIndex ? { ...food, [field]: fieldIsNumber(field) ? numOr(value, 0) : value } : food)),
            }
          : day,
      ),
    );
  };

  const kcalForFood = f => {
    const q = numOr(f.quantity, 0);
    const factor = q / 100;
    return Math.round(numOr(f.calories, 0) * factor);
  };

  const NumberField = memo(({ label, value, onChange }) => (
    <div>
      <label className='text-xs text-slate-600'>{label}</label>
      <input type='number' value={value} onChange={e => onChange(e.target.value)} className='w-full h-[34px] rounded-lg border border-slate-200 px-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500/30' step={fieldIsNumber(label.toLowerCase()) ? '0.1' : '1'} />
    </div>
  ));

  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        if (!name.trim()) return Notification('Plan name is required', 'error');
        if (days.length === 0) return Notification('Add at least one day to the plan', 'error');
        if (days.some(day => day.foods.length === 0)) return Notification('Each day must have at least one food item', 'error');
        if (days.some(day => day.foods.some(f => !f.name.trim()))) return Notification('Each food item must have a name', 'error');

        const payload = {
          name: name.trim(),
          desc: desc.trim() || null,
          isActive,
          days: days.map(day => ({
            day: day.day,
            name: day.name,
            foods: day.foods.map(f => ({
              name: f.name,
              category: f.category || null,
              calories: numOr(f.calories, 0),
              protein: numOr(f.protein, 0),
              carbs: numOr(f.carbs, 0),
              fat: numOr(f.fat, 0),
              unit: f.unit || 'g',
              quantity: numOr(f.quantity, 0),
              mealType: f.mealType,
              orderIndex: numOr(f.orderIndex, 0),
            })),
          })),
        };
        onSubmit?.(payload);
      }}
      className='space-y-6'>
      <div>
        <label className='text-sm font-medium text-slate-700 mb-2 block'>Plan Name</label>
        <input value={name} onChange={e => setName(e.target.value)} className='w-full rounded-lg border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white' placeholder='e.g., High Protein Diet…' required />
      </div>

      <div>
        <label className='text-sm font-medium text-slate-700 mb-2 block'>Description</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className='w-full rounded-lg border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white resize-none' placeholder='Optional description...' />
      </div>

      <div className='flex items-center gap-3'>
        <input type='checkbox' id='isActive' checked={isActive} onChange={e => setIsActive(e.target.checked)} className='rounded border-slate-300 text-indigo-600 focus:ring-indigo-500' />
        <label htmlFor='isActive' className='text-sm font-medium text-slate-700'>
          Active Plan
        </label>
      </div>

      <div className='border-t border-slate-100 pt-4'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='font-semibold text-slate-800'>Days & Foods</h3>
          <Button type='button' onClick={addDay} icon={<Plus className='w-4 h-4' />} name='Add Day' color='outline' />
        </div>

        {days.length === 0 ? (
          <div className='text-center py-8 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50'>
            <Utensils className='w-8 h-8 mx-auto mb-2 text-slate-400' />
            <p className='text-sm'>No days added yet</p>
          </div>
        ) : (
          <div className='space-y-4'>
            {days.map((day, dayIndex) => (
              <motion.div key={day.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='border border-slate-200 rounded-lg p-4 bg-white'>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='flex-1 grid grid-cols-2 gap-3'>
                    <div>
                      <label className='text-sm font-medium text-slate-700 mb-2 block'>Day</label>
                      <select value={day.day} onChange={e => updateDay(dayIndex, 'day', e.target.value)} className='w-full h-11 rounded-lg border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white'>
                        {DAYS.map(d => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className='text-sm font-medium text-slate-700 mb-2 block'>Day Name</label>
                      <input type='text' value={day.name} onChange={e => updateDay(dayIndex, 'name', e.target.value)} className='w-full h-11 rounded-lg border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white' placeholder='e.g., High Protein Day' />
                    </div>
                  </div>
                  <IconBtn title='Remove day' onClick={() => removeDay(dayIndex)} danger className='mt-6'>
                    <Trash2 className='w-4 h-4' />
                  </IconBtn>
                </div>

                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <h4 className='font-medium text-sm text-slate-800'>Foods</h4>
                    <Button type='button' onClick={() => addFoodToDay(dayIndex)} icon={<Plus className='w-4 h-4' />} name='Add Food' color='outline' className='!px-3 !py-1.5' />
                  </div>

                  {day.foods.length === 0 ? (
                    <div className='text-center py-4 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg bg-slate-50'>No foods added to this day</div>
                  ) : (
                    day.foods.map((f, foodIndex) => (
                      <div key={f.id} className='p-3 border border-slate-200 rounded-lg bg-slate-50 space-y-3'>
                        {/* row 1: name + category */}
                        <div className='grid grid-cols-2 gap-3'>
                          <div>
                            <label className='text-xs font-medium text-slate-700 mb-1 block'>Food Name</label>
                            <input type='text' value={f.name} onChange={e => updateFoodInDay(dayIndex, foodIndex, 'name', e.target.value)} className='w-full h-9 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500/30 bg-white' placeholder='e.g., Chicken Breast' required />
                          </div>
                          <div>
                            <label className='text-xs font-medium text-slate-700 mb-1 block'>Category</label>
                            <input type='text' value={f.category} onChange={e => updateFoodInDay(dayIndex, foodIndex, 'category', e.target.value)} className='w-full h-9 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500/30 bg-white' placeholder='Protein / Carb / Fat ...' />
                          </div>
                        </div>

                        {/* row 2: macros */}
                        <div className='grid grid-cols-5 gap-2'>
                          <NumberField label='Calories' value={f.calories} onChange={v => updateFoodInDay(dayIndex, foodIndex, 'calories', v)} />
                          <NumberField label='Protein' value={f.protein} onChange={v => updateFoodInDay(dayIndex, foodIndex, 'protein', v)} />
                          <NumberField label='Carbs' value={f.carbs} onChange={v => updateFoodInDay(dayIndex, foodIndex, 'carbs', v)} />
                          <NumberField label='Fat' value={f.fat} onChange={v => updateFoodInDay(dayIndex, foodIndex, 'fat', v)} />
                          <div>
                            <label className='text-xs font-medium text-slate-700 mb-1 block'>Unit</label>
                            <input value={f.unit} onChange={e => updateFoodInDay(dayIndex, foodIndex, 'unit', e.target.value)} className='w-full h-9 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500/30 bg-white' />
                          </div>
                        </div>

                        {/* row 3: qty + meal type + kcal preview */}
                        <div className='grid grid-cols-4 gap-2'>
                          <NumberField label='Quantity' value={f.quantity} onChange={v => updateFoodInDay(dayIndex, foodIndex, 'quantity', v)} />
                          <div>
                            <label className='text-xs font-medium text-slate-700 mb-1 block'>Meal Type</label>
                            <select value={f.mealType} onChange={e => updateFoodInDay(dayIndex, foodIndex, 'mealType', e.target.value)} className='w-full h-9 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500/30 bg-white'>
                              {MEAL_TYPES.map(meal => (
                                <option key={meal.value} value={meal.value}>
                                  {meal.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className='text-xs font-medium text-slate-700 mb-1 block'>Order</label>
                            <input type='number' value={f.orderIndex} onChange={e => updateFoodInDay(dayIndex, foodIndex, 'orderIndex', e.target.value)} className='w-full h-9 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500/30 bg-white' />
                          </div>
                          <div className='flex flex-col justify-end'>
                            <div className='text-xs font-medium text-slate-700'>Est. kcal</div>
                            <div className='h-9 flex items-center text-sm font-semibold text-slate-800'>{kcalForFood(f)} kcal</div>
                          </div>
                        </div>

                        {/* remove */}
                        <div className='flex justify-end'>
                          <IconBtn title='Remove food' onClick={() => removeFoodFromDay(dayIndex, foodIndex)} danger>
                            <Trash2 className='w-4 h-4' />
                          </IconBtn>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className='flex items-center justify-end gap-3 pt-4 border-t border-slate-100'>
        <Button name='Save Meal Plan' type='submit' />
      </div>
    </form>
  );
});
