'use client';

import { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import { AnimatePresence, LayoutGroup, motion, Reorder } from 'framer-motion';
import { Dumbbell, Plus, LayoutGrid, Rows, Eye, PencilLine, Trash2, CheckCircle2, Settings, Clock, ChevronUp, ChevronDown, Users as UsersIcon, ChevronRight, X, Layers, Search, Tag, GripVertical, RefreshCcw, UserCheck, Users, CalendarX } from 'lucide-react';

import api, { baseImg } from '@/utils/axios';
import { Modal, StatCard, TabsPill } from '@/components/dashboard/ui/UI';
import Button from '@/components/atoms/Button';
import Select from '@/components/atoms/Select';
import { useValues } from '@/context/GlobalContext';
import { Notification } from '@/config/Notification';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import { PrettyPagination } from '@/components/dashboard/ui/Pagination';
import Input from '@/components/atoms/Input';
import Textarea from '@/components/atoms/Textarea';
import { ExercisePicker } from '@/components/pages/dashboard/plans/ExercisePicker';

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

/* =============================== PAGE ROOT =============================== */
export default function PlansPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [changePlans, setChangePlans] = useState(null);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [searchText, setSearchText] = useState('');
  const debounced = useDebounced(searchText, 350);

  const [view, setView] = useState('list');
  const [preview, setPreview] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [assignOpen, setAssignOpen] = useState(null);

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

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

      const res = await api.get('/plans', {
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
      setErr(e?.response?.data?.message || 'Failed to load plans');
    } finally {
      if (myId === reqId.current) setLoading(false);
    }
  }, [page, debounced, sortBy, sortOrder, perPage]);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const params = {};
      if (debounced) params.search = debounced;
      const res = await api.get('/plans/overview', { params });
      setStats(res.data);
    } catch {
    } finally {
      setLoadingStats(false);
    }
  }, [debounced]);

  useEffect(() => {
    setPage(1);
  }, [debounced, sortBy, sortOrder, perPage]);

  useEffect(() => {
    fetchList();
  }, [changePlans, fetchList]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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

  const getOne = async id => (await api.get(`/plans/${id}`)).data;

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
      await api.delete(`/plans/${deleteId}`);
      setItems(arr => arr.filter(x => x.id !== deleteId));
      setTotal(t => Math.max(0, t - 1));
      Notification('Plan deleted successfully', 'success');
    } catch (e) {
      Notification(e?.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setDeleteId(null);
      setDeleteLoading(false);
      setDeleteOpen(false);
    }
  }, [deleteId]);

  const createPlan = async payload => {
    const res = await api.post('/plans', payload, { headers: { 'Content-Type': 'application/json' } });
    return res.data;
  };

  const updatePlan = async (id, payload) => {
    const res = await api.put(`/plans/${id}`, payload, { headers: { 'Content-Type': 'application/json' } });
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
      <GradientStatsHeader onClick={() => setAddOpen(true)} btnName={'New Plan'} title='Plans' desc='Create programs, organize days, and assign to athletes.' loadingStats={loadingStats}>
        <StatCard className=' ' icon={Layers} title='Total Plans' value={stats?.summary?.plans?.total || 0} />
        <StatCard className=' ' icon={CalendarX} title='Plans Without Days' value={stats?.summary?.plans?.withNoDays || 0} />
        <StatCard className=' ' icon={Users} title='Unassigned Plans' value={stats?.summary?.plans?.withNoAssignments || 0} />
        <StatCard className=' ' icon={UserCheck} title='Active Assignments' value={stats?.summary?.usage?.totalAssignments || 0} />
      </GradientStatsHeader>

      {/* Filters + search - Matching Exercises page */}
      <div className='relative '>
        <div className='flex items-center justify-between gap-2 flex-wrap'>
          {/* Search */}
          <div className='relative flex-1 max-w-[240px] sm:min-w-[260px]'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
            <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder='Search plans…' className={['h-11 w-full pl-10 pr-10 rounded-lg', 'border border-slate-200 bg-white/90 text-slate-900', 'shadow-sm hover:shadow transition', 'focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200/40'].join(' ')} />
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
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || 'Plan Preview'} maxW='max-w-4xl'>
        {preview && <PlanPreview plan={preview} />}
      </Modal>

      {/* New Plan Builder */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title='Create Plan' maxW='max-w-5xl'>
        <NewPlanBuilder
          onCancel={() => setAddOpen(false)}
          onCreate={async payload => {
            try {
              const saved = await createPlan(payload);
              setItems(arr => [saved, ...arr]);
              setTotal(t => t + 1);
              setAddOpen(false);
              Notification('Plan created', 'success');
            } catch (e) {
              Notification(e?.response?.data?.message || 'Create failed', 'error');
            }
          }}
        />
      </Modal>

      {/* Edit */}
      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Edit: ${editRow?.name || ''}`} maxW='max-w-5xl'>
        {editRow && (
          <NewPlanBuilder
            initial={editRow}
            onCancel={() => setEditRow(null)}
            onCreate={async payload => {
              try {
                const saved = await updatePlan(editRow.id, payload);
                setItems(arr => arr.map(p => (p.id === editRow.id ? saved : p)));
                setEditRow(null);
                Notification('Plan updated', 'success');
              } catch (e) {
                Notification(e?.response?.data?.message || 'Update failed', 'error');
              }
            }}
          />
        )}
      </Modal>

      {/* Assign */}
      <Modal open={!!assignOpen} onClose={() => setAssignOpen(null)} title={`Assign: ${assignOpen?.name || ''}`} maxW='max-w-md'>
        {assignOpen && <AssignForm setChangePlans={setChangePlans} setPlans={setItems} plans={items} planId={assignOpen.id} optionsClient={optionsClient} onClose={() => setAssignOpen(null)} onAssigned={() => setAssignOpen(null)} />}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        loading={deleteLoading}
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteId(null);
        }}
        title='Delete plan?'
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
          <Dumbbell className='w-8 h-8 text-slate-500' />
        </div>
        <h3 className='mt-4 text-lg font-semibold text-slate-800'>No plans found</h3>
        <p className='text-sm text-slate-600 mt-1'>Try a different search or create a new plan.</p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
      {items.map(p => {
        const dayCount = p?.days?.length || 0;
        const assignments = Array.isArray(p?.assignments) ? p.assignments : [];
        const totalAssignees = assignments.length;
        const activeAssignees = assignments.filter(a => a?.isActive).length;

        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.995 }}
            transition={spring}
            className='group relative overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm 
             hover:shadow-lg transition-shadow duration-300 will-change-transform'>
            {/* ✨ Gradient glow ring */}
            <span
              aria-hidden
              className='pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300
               group-hover:opacity-100'
              style={{
                background: 'radial-gradient(60% 60% at 50% 10%, rgba(99,102,241,0.20), transparent 70%), radial-gradient(60% 60% at 80% 30%, rgba(168,85,247,0.18), transparent 70%)',
              }}
            />

            {/* ✨ Sheen swipe across header on hover */}
            <span
              aria-hidden
              className='pointer-events-none absolute -top-24 left-[-30%] h-48 w-1/2 rotate-[25deg] 
               bg-gradient-to-r from-white/0 via-white/25 to-white/0 
               opacity-0 group-hover:opacity-100 transition-opacity duration-300'
            />
            <span
              aria-hidden
              className='pointer-events-none absolute -top-24 left-[-40%] h-48 w-1/2 rotate-[25deg] 
               bg-gradient-to-r from-white/0 via-white/25 to-white/0 
               translate-x-[-20%] group-hover:translate-x-[220%] transition-transform duration-700 ease-out'
            />

            {/* Header */}
            <div className={`relative p-4 space-y-2 ${p.notes ? 'pb-[68px]' : 'pb-[85px]'}`}>
              {/* Title row */}
              <div className='flex items-start justify-between gap-2'>
                <div className='font-semibold text-slate-900 leading-5 line-clamp-1' title={p.name}>
                  {p.name}
                </div>

                {/* Tools column: slide+fade in on hover */}
                <div className='absolute right-1 top-1'>
                  <div
                    className='flex flex-col items-center gap-1 rounded-lg backdrop-blur px-1 py-1 
                     transition-all duration-300 group-hover:bg-white/80
                     translate-y-[-6px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100'>
                    <IconBtn title='View' onClick={() => onPreview?.(p)}>
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
              </div>

              {/* Description */}
              {p.notes ? <p className='text-[13px] text-slate-600 line-clamp-1'>{p.notes}</p> : null}

              {/* Meta row */}
              <div className='flex flex-wrap items-center gap-2 pt-1'>
                <span className='text-[11px] rounded-lg border border-slate-200 px-2 py-1 text-slate-600 bg-slate-50'>
                  Days <span className='font-medium'>/ {dayCount}</span>
                </span>
                {totalAssignees > 0 && (
                  <span className='text-[11px] rounded-lg border border-slate-200 px-2 py-1 text-slate-600 bg-slate-50'>
                    Users{' '}
                    <span className='font-medium'>
                      {activeAssignees}/{totalAssignees}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Footer (lifts on card hover) */}
            <div className='px-4 pb-4 absolute bottom-[-4px] w-full left-0'>
              <div className='transition-transform duration-300 group-hover:-translate-y-0.5'>
                <Button onClick={() => onAssign?.(p)} color='outline' className='!w-full' icon={<UsersIcon className='w-4 h-4' />} name={`Assign${totalAssignees ? ` (${totalAssignees})` : ''}`} />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});

/* ================================ LIST VIEW ================================ */

export const ListView = memo(function ListView({ loading, items = [], onPreview, onEdit, onDelete, onAssign }) {
  /* ---------- Loading (skeleton list) ---------- */
  if (loading) {
    return (
      <div className='divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className='group relative flex items-center gap-3 px-4 py-3'>
            {/* gradient hairline left */}
            <span aria-hidden className='absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-indigo-500/80 to-violet-500/80 opacity-60' />
            <div className='grid h-12 w-12 place-content-center rounded-lg bg-slate-100 shimmer' />
            <div className='min-w-0 flex-1'>
              <div className='mb-2 h-4 w-40 rounded shimmer' />
              <div className='h-3 w-24 rounded shimmer' />
            </div>
            <div className='h-8 w-28 rounded shimmer' />
          </div>
        ))}
      </div>
    );
  }

  /* ---------- Empty ---------- */
  if (!items.length) {
    return (
      <div className='rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm'>
        <div className='mx-auto grid h-16 w-16 place-content-center rounded-xl bg-slate-100'>
          <Dumbbell className='h-8 w-8 text-slate-500' />
        </div>
        <h3 className='mt-4 text-lg font-semibold text-slate-900'>No plans found</h3>
        <p className='mt-1 text-sm text-slate-600'>Try a different search or create a new plan.</p>
      </div>
    );
  }

  /* ---------- List (grid-inspired styling) ---------- */
  return (
    <div className='divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'>
      {items.map(p => {
        const dayCount = Array.isArray(p?.days) ? p.days.length : 0;
        const assignments = Array.isArray(p?.assignments) ? p.assignments : [];
        const totalAssignees = assignments.length;
        const active = !!p?.isActive;

        return (
          <div key={p.id} className='group relative flex items-start gap-3 px-4 py-3 transition-all duration-300 hover:bg-slate-50/60'>
            {/* left gradient hairline (grid DNA) */}
            <span aria-hidden className='absolute left-0 top-0 h-full w-1 rounded-tr-lg rounded-br-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-70' />

            {/* icon tile (grid DNA) */}
            <div className='mt-0.5 grid h-12 w-12 shrink-0 place-content-center rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-95 text-white shadow-sm'>
              <Dumbbell className='h-5 w-5' />
            </div>

            {/* content */}
            <div className='min-w-0 flex-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <div className='truncate text-sm font-semibold text-slate-900'>{p.name}</div>
                <span className={['inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] ring-1 ring-inset', active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'].join(' ')}>{active ? 'Active' : 'Inactive'}</span>
              </div>

              {p.notes ? <p className='mt-1 line-clamp-1 text-[13px] leading-5 text-slate-600'>{p.notes}</p> : <p className='mt-1 text-[13px] text-slate-500'>No description.</p>}

              <div className='mt-1 flex flex-wrap items-center gap-2 text-[12px] text-slate-600'>
                <span className='rounded-lg border border-slate-200 bg-white px-2 py-0.5'>
                  {dayCount} day{dayCount === 1 ? '' : 's'}
                </span>
                <span className='rounded-lg border border-slate-200 bg-white px-2 py-0.5'>
                  {totalAssignees} user{totalAssignees === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* actions: primary + rail (grid DNA) */}
            <div className='ml-auto flex shrink-0 items-center gap-1'>
              {/* Primary action: Assign */}
              <button type='button' onClick={() => onAssign?.(p)} className='inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition-all hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30 active:scale-[.98]' title='Assign'>
                <UsersIcon className='h-4 w-4' />
                Assign{totalAssignees ? ` (${totalAssignees})` : ''}
              </button>

              {/* Hover rail (appears on row hover) */}
              <div className='flex items-center gap-1 '>
                <button type='button' title='Preview' onClick={() => onPreview?.(p)} className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30'>
                  <Eye className='h-4 w-4' />
                </button>
                <button type='button' title='Edit' onClick={() => onEdit?.(p)} className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/30'>
                  <PencilLine className='h-4 w-4' />
                </button>
                <button type='button' title='Delete' onClick={() => onDelete?.(p.id)} className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300/30'>
                  <Trash2 className='h-4 w-4' />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

const PlanPreview = memo(({ plan }) => {
  const [assignees, setAssignees] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get(`/plans/${plan.id}/assignees`);
        if (mounted) setAssignees(res.data || []);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, [plan.id]);

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${plan.isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-800 border border-slate-200'}`}>{plan.isActive ? 'Active' : 'Inactive'}</span>
        {plan.startDate || plan.endDate ? (
          <span className='inline-flex items-center gap-1 rounded-lg bg-blue-100 text-blue-800 px-2.5 py-1 text-xs font-medium border border-blue-200'>
            {plan.startDate || '—'} <ChevronRight className='w-3 h-3' /> {plan.endDate || '—'}
          </span>
        ) : null}
      </div>

      {plan.notes ? <div className='text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200'>{plan.notes}</div> : null}

      <div className='space-y-4'>
        {(plan.days || []).map((d, idx) => (
          <div key={d.id || idx} className='rounded-lg border border-slate-200 bg-white'>
            <div className='px-4 py-3 border-b border-slate-100 flex items-center justify-between'>
              <div className='font-semibold'>{d.name}</div>
              <div className='text-xs text-slate-500'>{String(d.day || d.dayOfWeek || '').toLowerCase()}</div>
            </div>
            <div className='p-4'>
              {(d.exercises || []).length ? (
                <ol className='space-y-2'>
                  {d.exercises.map((ex, i) => (
                    <li key={ex.id || ex.exerciseId || i} className='flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2'>
                      <div className='flex items-center gap-2'>
                        <span className='w-6 h-6 text-[11px] grid place-content-center rounded bg-white border border-slate-200 text-slate-700'>{i + 1}</span>
                        <div className='font-medium text-slate-800'>{ex.name || ex.exercise?.name || `Exercise #${i + 1}`}</div>
                        {ex.exercise?.category ? (
                          <span className='ml-2 text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200'>
                            <Tag className='inline w-3 h-3 mr-1' />
                            {ex.exercise.category}
                          </span>
                        ) : null}
                      </div>
                      {ex.targetReps || ex.targetSets || ex.restSeconds || ex.rest || ex.tempo ? (
                        <div className='text-xs text-slate-500'>
                          {ex.targetSets ? `Sets ${ex.targetSets}` : ''} {ex.targetReps ? `· Reps ${ex.targetReps}` : ''} {ex.restSeconds ? `· Rest ${ex.restSeconds}s` : ex.rest ? `· Rest ${ex.rest}s` : ''} {ex.tempo ? `· Tempo ${ex.tempo}` : ''}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className='text-xs text-slate-400'>No exercises yet</div>
              )}
            </div>
          </div>
        ))}
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
const AssignForm = memo(({ planId, onClose, onAssigned, optionsClient, setChangePlans }) => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get(`/plans/${planId}/assignees`);
        const curr = (res.data || []).map(a => a?.athlete?.id).filter(Boolean);
        if (!mounted) return;
        const ids = new Set(curr);
        const pre = optionsClient.filter(o => ids.has(o.id));
        setSelectedUsers(pre);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, [planId, optionsClient]);

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
      const athleteIds = selectedUsers.map(u => u.id);

      const res = await api.post(`/plans/${planId}/assign`, {
        athleteIds,
        isActive: true,
        confirm: 'yes',
      });

      setChangePlans(JSON.stringify(athleteIds + planId));

      Notification('Assigned successfully', 'success');
      onAssigned?.();
    } catch (err) {
      Notification(err?.response?.data?.message || 'Failed to assign', 'error');
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

/* ============================ NEW PLAN BUILDER ============================ */
const NewPlanBuilder = memo(({ initial, onCancel, onCreate }) => {
  const [name, setName] = useState(initial?.name || '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [notes, setNotes] = useState(initial?.notes || '');

  const [days, setDays] = useState(() => {
    const d = initial?.days || initial?.program?.days || [];
    return d.map((x, i) => ({
      id: x.id || `day_${i}`,
      dayOfWeek: (x.day || x.dayOfWeek || '').toLowerCase() || 'monday',
      nameOfWeek: x.nameOfWeek || x.name || `Day ${i + 1}`,
      exercises: (x.exercises || []).map((e, j) => ({
        exerciseId: e.exerciseId || e.exercise?.id || e.id,
        name: e.name || e.exercise?.name || `Exercise #${j + 1}`,
        category: e.exercise?.category || e.category || null,
        order: e.order || e.orderIndex || j + 1,
      })),
    }));
  });

  const addDay = () => {
    const idx = days.length + 1;
    setDays(arr => [
      ...arr,
      {
        id: `day_${Date.now()}`,
        dayOfWeek: 'monday',
        nameOfWeek: `Day ${idx}`,
        exercises: [],
      },
    ]);
  };

  const removeDay = id => setDays(arr => arr.filter(d => d.id !== id));

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDayId, setPickerDayId] = useState(null);

  const openPicker = dayId => {
    setPickerDayId(dayId);
    setPickerOpen(true);
  };

  const onPickerDone = selected => {
    setDays(arr =>
      arr.map(d => {
        if (d.id !== pickerDayId) return d;
        const base = d.exercises.slice();
        const start = base.length + 1;
        const toAdd = selected.map((s, i) => ({
          exerciseId: s.id,
          name: s.name,
          category: s.category || null,
          order: start + i,
        }));
        return { ...d, exercises: [...base, ...toAdd] };
      }),
    );
    setPickerOpen(false);
    setPickerDayId(null);
  };

  const onReorderExercises = (dayId, newOrder) => {
    setDays(arr =>
      arr.map(d => {
        if (d.id !== dayId) return d;
        const reordered = newOrder.map((ex, idx) => ({ ...ex, order: idx + 1 }));
        return { ...d, exercises: reordered };
      }),
    );
  };

  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!name.trim()) {
      Notification('Plan name is required', 'error');
      return;
    }
    if (!days.length) {
      Notification('Add at least one day', 'error');
      return;
    }
    if (days.some(d => !d.exercises.length)) {
      Notification('Each day needs at least one exercise', 'error');
      return;
    }

    const payload = {
      name: name.trim(),
      isActive: !!isActive,
      notes: notes || null,
      program: {
        days: days.map(d => ({
          dayOfWeek: d.dayOfWeek,
          nameOfWeek: d.nameOfWeek,
          exercises: d.exercises.map(ex => ({ order: ex.order, exerciseId: ex.exerciseId })),
        })),
      },
    };
    setLoading(true);
    await onCreate?.(payload);
    setLoading(false);
  };

  const DAY_OPTIONS = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(d => ({
    id: d,
    label: d.charAt(0).toUpperCase() + d.slice(1),
  }));

  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <Input label={'Plan name'} value={name} onChange={e => setName(e)} placeholder='Push Pull Legs…' />
        <Textarea label='Notes' rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder='Program notes, goals, tempo schemes, etc.' />
      </div>

      <div className='flex items-center justify-between pt-4 border-t border-slate-100'>
        <div className='text-sm font-semibold text-slate-800'>Days</div>

        <button type='button' onClick={addDay} className='inline-flex items-center gap-2 rounded-lg border border-slate-300  bg-white px-4 py-2 text-sm font-medium text-slate-800  shadow-sm hover:bg-slate-50 active:scale-[.97]  focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30  transition-all duration-200'>
          <Plus className='w-4 h-4 text-slate-700' />
          <span>Add day</span>
        </button>
      </div>

      <DaysListSection days={days} setDays={setDays} openPicker={openPicker} removeDay={removeDay} onReorderExercises={onReorderExercises} DAY_OPTIONS={DAY_OPTIONS} spring={spring} />

      <div className='flex items-center justify-end gap-3 pt-4 border-t border-slate-100'>
        <button type='button' onClick={onCancel} className='inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300  bg-white px-4 py-2.5 text-sm font-medium text-slate-700  shadow-sm hover:bg-slate-50 active:scale-[.97]  focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30  transition-all duration-200'>
          Cancel
        </button>

        <Button name={'Save plan'} loading={loading} type='button' onClick={submit} className='!w-fit text-sm !h-[39px]'>
          {' '}
        </Button>
      </div>

      {/* Full-screen Exercise Picker */}
      <ExercisePicker
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setPickerDayId(null);
        }}
        onDone={onPickerDone}
      />
    </div>
  );
});

export function DaysListSection({ days, setDays, openPicker, removeDay, onReorderExercises, DAY_OPTIONS, spring }) {
  /* --- tiny inline button helpers --- */
  const btnBase = ' h-[35px] inline-flex items-center justify-center gap-2 rounded-lg text-sm transition ' + 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30 active:scale-[.98]';
  const btnOutline = 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 px-3 py-1.5 shadow-sm';
  const btnGhostDanger = 'border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 px-2.5 py-1.5';
  const iconBtn = 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white ' + 'text-slate-700 hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-slate-400/30';

  return (
    <div className='space-y-4'>
      {days.map(d => (
        <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='overflow-hidden rounded-lg border border-slate-200 bg-white'>
          {/* Header row */}
          <div className='flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3'>
            <div className='flex flex-wrap items-center gap-3'>
              <div className='font-semibold text-slate-900 uppercase  '>{d.nameOfWeek}</div>
              <Select
                className='!w-[160px]'
                placeholder='Select day'
                options={DAY_OPTIONS.map(o => ({ id: o.id, label: o.label }))}
                value={d.dayOfWeek}
                onChange={val => {
                  setDays(arr => arr.map(x => (x.id === d.id ? { ...x, dayOfWeek: val } : x)));
                }}
              />
            </div>

            <div className='flex items-center gap-2'>
              {/* Add exercises */}
              <button type='button' onClick={() => openPicker(d.id)} className={`${btnBase} ${btnOutline} !px-3 !py-1.5`} title='Add exercises'>
                <Plus className='w-4 h-4' />
                Add exercises
              </button>

              {/* Remove day */}
              <button type='button' onClick={() => removeDay(d.id)} className={`${btnBase} ${btnGhostDanger}`} title='Remove day'>
                <Trash2 className='w-4 h-4' />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className='p-4'>
            {d.exercises.length ? (
              <Reorder.Group axis='y' values={d.exercises} onReorder={newOrder => onReorderExercises(d.id, newOrder)} className='space-y-2'>
                {d.exercises.map(ex => (
                  <Reorder.Item key={ex.exerciseId} value={ex} dragListener dragConstraints={{ top: 0, bottom: 0 }} className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition-colors hover:bg-slate-100'>
                    <div className='flex items-center justify-between gap-3'>
                      <div className='flex min-w-0 items-center gap-3'>
                        <GripVertical className='w-4 h-4 shrink-0 cursor-grab text-slate-400' />
                        <div className='truncate font-medium text-slate-900'>{ex.name}</div>
                        {ex.category ? (
                          <span className='inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] text-indigo-700'>
                            <Tag size={12} />
                            {ex.category}
                          </span>
                        ) : null}
                      </div>

                      {/* Remove exercise */}
                      <button
                        type='button'
                        onClick={() =>
                          setDays(arr =>
                            arr.map(x =>
                              x.id === d.id
                                ? {
                                    ...x,
                                    exercises: x.exercises.filter(e => e.exerciseId !== ex.exerciseId),
                                  }
                                : x,
                            ),
                          )
                        }
                        className={iconBtn}
                        title='Remove exercise'>
                        <Trash2 className='w-4 h-4' />
                      </button>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            ) : (
              <div className='rounded-lg border border-dashed border-slate-200 bg-slate-50 py-6 text-center text-sm text-slate-500'>
                No exercises. Click <span className='font-medium'>“Add exercises”</span> to add exercises to this day.
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
