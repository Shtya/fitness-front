
'use client';

import { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, PencilLine, LayoutGrid, Rows, Eye, Trash2, Layers, Settings, RefreshCcw, Clock, X, Tag, Search, Play, Image as ImageIcon, PlayCircle, TagIcon } from 'lucide-react';

import api, { baseImg } from '@/utils/axios';
import { Modal, StatCard, TabsPill } from '@/components/dashboard/ui/UI';
import Img from '@/components/atoms/Img';
import Button from '@/components/atoms/Button';
import Select from '@/components/atoms/Select';
import { Notification } from '@/config/Notification';
import { ExerciseForm } from '@/components/pages/dashboard/workouts/ExerciseForm';
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

const buildMultipartIfNeeded = payload => {
  const hasFile = payload.imgFile || payload.videoFile;
  if (!hasFile) return null;
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (k === 'imgFile' && v) fd.append('img', v);
    else if (k === 'videoFile' && v) fd.append('video', v);
    else if (Array.isArray(v)) fd.append(k, JSON.stringify(v));
    else fd.append(k, String(v));
  });
  return fd;
};

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

/* ------------------------------ Main Component ----------------------------- */
export default function ExercisesPage() {
  // list + stats
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // categories UI
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState('all');

  // server paging/sort/search
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [searchText, setSearchText] = useState('');
  const debounced = useDebounced(searchText, 350);

  // ui
  const [view, setView] = useState('grid');
  const [preview, setPreview] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  // delete modal state
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // race guard and request cancellation
  const reqId = useRef(0);
  const abortControllerRef = useRef(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/plan-exercises/categories');
      const cats = Array.isArray(res.data) ? res.data.filter(Boolean) : [];
      setCategories(cats);
    } catch {
      setCategories([]);
    }
  }, []);

  const fetchList = useCallback(async () => {
    // Cancel previous request
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
      if (activeCat && activeCat !== 'all') params.category = activeCat;

      const res = await api.get('/plan-exercises', {
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
      if (e.name === 'CanceledError') return; // Ignore canceled requests
      if (myId !== reqId.current) return;
      setErr(e?.response?.data?.message || 'Failed to load exercises');
    } finally {
      if (myId === reqId.current) setLoading(false);
    }
  }, [page, debounced, sortBy, sortOrder, perPage, activeCat]);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const params = {};
      if (debounced) params.search = debounced;
      if (activeCat && activeCat !== 'all') params.category = activeCat;
      const res = await api.get('/plan-exercises/stats', { params });
      setStats(res.data);
    } catch {
      // ignore
    } finally {
      setLoadingStats(false);
    }
  }, [debounced, activeCat]);

  // Reset to page 1 on search/sort/category changes
  useEffect(() => {
    setPage(1);
  }, [debounced, sortBy, sortOrder, perPage, activeCat]);

  // Initial load
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Data fetching with optimized dependencies
  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Cleanup on unmount
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

  /* ----------------------------- CRUD Handlers ---------------------------- */
  const askDelete = useCallback(id => {
    setDeleteId(id);
    setDeleteOpen(true);
  }, []);

  const [deleteLoading, setDeleteLoading] = useState(false);
  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/plan-exercises/${deleteId}`);
      setItems(arr => arr.filter(x => x.id !== deleteId));
      setTotal(t => Math.max(0, t - 1));
      Notification('Exercise deleted', 'success');
    } catch (e) {
      Notification(e?.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setDeleteId(null);
      setDeleteLoading(false);
    }
  }, [deleteId]);

  const createOrUpdate = useCallback(async ({ id, payload }) => {
    const body = {
      name: payload.name,
      details: payload.details || null,
      category: payload.category || null,
      primaryMusclesWorked: payload.primaryMusclesWorked || [],
      secondaryMusclesWorked: payload.secondaryMusclesWorked || [],
      targetReps: payload.targetReps || '10',
      targetSets: Number(payload.targetSets || 3),
      rest: Number(payload.rest || 90),
      tempo: payload.tempo || null,
      img: payload.imgFile ? undefined : payload.imgUrl || undefined,
      video: payload.videoFile ? undefined : payload.videoUrl || undefined,
      imgFile: payload.imgFile || undefined,
      videoFile: payload.videoFile || undefined,
    };

    const fd = buildMultipartIfNeeded(body);
    const url = id ? `/plan-exercises/${id}` : '/plan-exercises';
    const method = id ? 'put' : 'post';
    const res = await api[method](url, fd || body, fd ? undefined : { headers: { 'Content-Type': 'application/json' } });
    return res.data;
  }, []);

  /* ---------------------------- Memoized Values --------------------------- */
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / Math.max(1, perPage))), [total, perPage]);

  const tabs = useMemo(() => {
    const base = [{ key: 'all', label: 'All' }];
    return base.concat((categories || []).map(c => ({ key: c, label: c })));
  }, [categories]);

  const handleAddSubmit = useCallback(
    async payload => {
      try {
        const saved = await createOrUpdate({ payload });
        setItems(arr => [saved, ...arr]);
        setTotal(t => t + 1);
        setAddOpen(false);
        Notification('Exercise created', 'success');
        if (saved?.category && !categories.includes(saved.category)) {
          setCategories(prev => [...prev, saved.category].sort());
        }
      } catch (e) {
        Notification(e?.response?.data?.message || 'Create failed', 'error');
      }
    },
    [createOrUpdate, categories],
  );

  const handleEditSubmit = useCallback(
    async payload => {
      try {
        const saved = await createOrUpdate({ id: editRow.id, payload });
        setItems(arr => arr.map(e => (e.id === editRow.id ? saved : e)));
        setEditRow(null);
        Notification('Exercise updated', 'success');
        if (saved?.category && !categories.includes(saved.category)) {
          setCategories(prev => [...prev, saved.category].sort());
        }
      } catch (e) {
        Notification(e?.response?.data?.message || 'Update failed', 'error');
      }
    },
    [createOrUpdate, editRow, categories],
  );

  return (
    <div className='space-y-6'>
      {/* Header / Stats */}
      <GradientStatsHeader onClick={() => setAddOpen(true)} btnName={'Add Exercise'} title='Exercises' desc="Manage your gym's exercise library." loadingStats={loadingStats}>
        <StatCard className=' ' icon={Layers} title='Total' value={stats?.totals?.total || 0} />
        <StatCard className=' ' icon={Settings} title='With Video' value={stats?.totals?.withVideo || 0} />
        <StatCard className=' ' icon={RefreshCcw} title='With Image' value={stats?.totals?.withImage || 0} />
        <StatCard className=' ' icon={Clock} title='Avg Rest (s)' value={stats?.totals?.avgRest ?? 0} sub={`${stats?.totals?.created7d || 0} added 7d`} />
      </GradientStatsHeader>

      {/* Filters + search */}
      <div className='relative '>
        <div className='flex items-center justify-between gap-2 flex-wrap'>
          {/* Search */}
          <div className='relative flex-1 max-w-[240px] sm:min-w-[260px]'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
            <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder='Search name…' className={['h-11 w-full pl-10 pr-10 rounded-lg', 'border border-slate-200 bg-white/90 text-slate-900', 'shadow-sm hover:shadow transition', 'focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200/40'].join(' ')} />
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

      {tabs?.length > 1 && (
        <div>
          <TabsPill id='exercise-cats' className='!bg-white' tabs={tabs} active={activeCat} onChange={key => setActiveCat(key)} />
        </div>
      )}

      {/* Errors */}
      {err ? <div className='p-3 rounded-lg bg-red-50 text-red-700 border border-red-100'>{err}</div> : null}

      {/* Content */}
      {view === 'grid' ? <GridView loading={loading} items={items} onView={setPreview} onEdit={setEditRow} onDelete={askDelete} /> : <ListView loading={loading} items={items} onView={setPreview} onEdit={setEditRow} onDelete={askDelete} />}

      <PrettyPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Preview */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || 'Preview'} maxW='max-w-3xl'>
        {preview && <ExercisePreview exercise={preview} />}
      </Modal>

      {/* Add */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title='Add Exercise'>
        <ExerciseForm categories={categories} onSubmit={handleAddSubmit} />
      </Modal>

      {/* Edit */}
      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Edit: ${editRow?.name || ''}`}>
        {editRow && <ExerciseForm categories={categories} initial={editRow} onSubmit={handleEditSubmit} />}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        loading={deleteLoading}
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteId(null);
        }}
        title='Delete exercise?'
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

const GridView = memo(({ loading, items, onView, onEdit, onDelete }) => {
  /* ------------------------------- Loading ------------------------------- */
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

  /* ------------------------------- Empty -------------------------------- */
  if (!items?.length) {
    return (
      <div className='rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm'>
        <div className='mx-auto w-16 h-16 rounded-lg bg-slate-100 grid place-content-center'>
          <Dumbbell className='w-8 h-8 text-slate-500' />
        </div>
        <h3 className='mt-4 text-lg font-semibold text-slate-800'>No exercises found</h3>
        <p className='text-sm text-slate-600 mt-1'>Try a different search or add a new exercise.</p>
      </div>
    );
  }

  /* -------------------------------- Grid -------------------------------- */
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
      {items.map(e => {
        const hasImg = Boolean(e.img);
        const hasVideo = Boolean(e.video);
        const sets = e.targetSets ?? 3;
        const reps = e.targetReps ?? '—';
        const rest = e.rest ?? 90;

        return (
          <motion.div key={e.id} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring} className='group relative overflow-hidden rounded-lg bg-white border border-slate-200 shadow-sm hover:shadow-md'>
            {/* premium gradient ring on hover */}
            <div className='pointer-events-none absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300' style={{ WebkitMaskImage: 'linear-gradient(#000 60%, transparent)' }}>
              <div className='absolute inset-0 rounded-lg ring-1 ring-transparent' style={{ background: 'linear-gradient(90deg, rgba(99,102,241,.18), rgba(16,185,129,.18))', maskImage: 'linear-gradient(black, transparent 70%)' }} />
            </div>

            {/* Media */}
            <div className='relative aspect-4/2 bg-slate-50'>
              {hasImg ? (
                <Img src={e.img} alt={e.name} className='w-full h-full object-contain' loading='lazy' />
              ) : hasVideo ? (
                <div className='w-full h-full grid place-content-center text-slate-400'>
                  <Play className='w-9 h-9' />
                </div>
              ) : (
                <div className='w-full h-full grid place-content-center text-slate-300'>
                  <Play className='w-9 h-9' />
                </div>
              )}

              <div className='absolute right-1 top-1'>
                <div className='flex flex-col items-center gap-1 rounded-[8px_8px_8px_8px] bg-white/90 border border-slate-200/70 shadow-sm backdrop-blur px-1 py-1 hover:bg-white transition'>
                  <IconBtn title='View' onClick={() => onView?.(e)}>
                    <Eye className='w-3.5 h-3.5 text-slate-700' />
                  </IconBtn>
                  <IconBtn title='Edit' onClick={() => onEdit?.(e)}>
                    <PencilLine className='w-3.5 h-3.5 text-indigo-600' />
                  </IconBtn>
                  <IconBtn title='Delete' onClick={() => onDelete?.(e.id)} danger>
                    <Trash2 className='w-3.5 h-3.5' />
                  </IconBtn>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className='p-4 space-y-2'>
              {/* Title row */}
              <div className='flex items-start justify-between gap-2'>
                <div className='font-semibold text-slate-800 leading-5 line-clamp-1' title={e.name}>
                  {e.name}
                </div>
              </div>

              <span className='inline-flex items-center gap-1 rounded-lg bg-indigo-600/90 text-white text-[11px] px-2 py-1 shadow'>
                <Tag size={12} /> {e.category}
              </span>

              {/* Description */}
              {e.details ? <p className='text-sm text-slate-600 line-clamp-1'>{e.details}</p> : null}

              {/* Meta row */}
              <div className='flex flex-wrap items-center gap-2 pt-1'>
                <span className='text-[11px] rounded-lg border border-slate-200 px-2 py-1 text-slate-600'>
                  Sets <span className='font-medium'> / {sets}</span>
                </span>
                <span className='text-[11px] rounded-lg border border-slate-200 px-2 py-1 text-slate-600'>
                  Rest <span className='font-medium'>{rest}s</span>
                </span>
                {e.tempo ? (
                  <span className='text-[11px] rounded-lg border border-slate-200 px-2 py-1 text-slate-600'>
                    Tempo <span className='font-medium'>{e.tempo}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});

const ListView = memo(({ loading, items = [], onView, onEdit, onDelete }) => {
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
    return <div className='rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm'>No exercises found.</div>;
  }

  return (
    <div className='rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 shadow-sm'>
      {items.map(e => {
        const hasImg = Boolean(e.img);
        const sets = e.targetSets ?? 3;
        const reps = e.targetReps ?? '—';
        const rest = e.rest ?? 90;

        const primary = Array.isArray(e.primaryMusclesWorked) ? e.primaryMusclesWorked : [];
        const secondary = Array.isArray(e.secondaryMusclesWorked) ? e.secondaryMusclesWorked : [];
        const muscles = [...primary, ...secondary].filter(Boolean);

        return (
          <div key={e.id} className='p-3 sm:p-4 flex items-center justify-between gap-3'>
            {/* Left: media + content */}
            <div className='flex items-start gap-3 min-w-0'>
              {/* Thumb */}
              <div className='w-16 h-[64px] rounded-lg bg-slate-50 grid place-content-center overflow-hidden shrink-0 border border-slate-200'>{hasImg ? <Img src={e.img} alt={e.name} className='w-full h-full object-cover' loading='lazy' /> : <Play className='w-5 h-5 text-slate-400' />}</div>

              {/* Text area */}
              <div className='min-w-0'>
                {/* Title + category */}
                <div className='flex items-center gap-2 min-w-0'>
                  <div className='font-medium text-slate-800 truncate'>{e.name}</div>
                  {e.category ? (
                    <span className='inline-flex items-center gap-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] px-2 py-0.5 shrink-0'>
                      <Tag size={12} /> {e.category}
                    </span>
                  ) : null}
                </div>

                {/* Details one-liner */}
                {e.details ? <div className='text-[12px] text-slate-600 line-clamp-1'>{e.details}</div> : null}

                {/* Meta */}
                <div className='mt-1 text-[11px] text-slate-500'>
                  Sets <span className='font-medium'>{sets}</span> · Reps <span className='font-medium'>{rest}s</span>
                  {e.tempo ? (
                    <>
                      {' '}
                      · Tempo <span className='font-medium'>{e.tempo}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Right: compact actions */}
            <div className='flex items-center gap-1 shrink-0'>
              <IconBtn title='View' onClick={() => onView?.(e)}>
                <Eye className='w-3.5 h-3.5' />
              </IconBtn>
              <IconBtn title='Edit' onClick={() => onEdit?.(e)}>
                <PencilLine className='w-3.5 h-3.5 text-indigo-600' />
              </IconBtn>
              <IconBtn title='Delete' onClick={() => onDelete?.(e.id)} danger>
                <Trash2 className='w-3.5 h-3.5' />
              </IconBtn>
            </div>
          </div>
        );
      })}
    </div>
  );
});

 const ExercisePreview = memo(({ exercise, baseMedia = '' }) => {
  const hasImg = !!exercise?.img;
  const hasVideo = !!exercise?.video;

  const [tab, setTab] = useState(hasImg ? 'image' : 'video');
  useEffect(() => {
    setTab(hasImg ? 'image' : 'video');
  }, [exercise?.id, hasImg, hasVideo]);

  const primary = useMemo(() => exercise?.primaryMusclesWorked || [], [exercise]);
  const secondary = useMemo(() => exercise?.secondaryMusclesWorked || [], [exercise]);

  const activeTabDisabled = (tab === 'image' && !hasImg) || (tab === 'video' && !hasVideo);

  return (
    <div className='space-y-4'>
      {/* Tabs */}
      {(hasImg || hasVideo) && (
        <div className='inline-flex items-center gap-2 rounded-lg bg-slate-100/70 p-1 ring-1 ring-black/5'>
          <button type='button' aria-pressed={tab === 'image'} disabled={!hasImg} onClick={() => setTab('image')} className={['relative inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg outline-none transition', tab === 'image' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-700 hover:text-slate-900', !hasImg ? 'opacity-50 cursor-not-allowed' : ''].join(' ')}>
            <ImageIcon size={14} />
            Image
            {tab === 'image' && <span className='absolute inset-x-2 -bottom-[6px] h-[2px] rounded-full bg-slate-900/80' />}
          </button>

          <button type='button' aria-pressed={tab === 'video'} disabled={!hasVideo} onClick={() => setTab('video')} className={['relative inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg outline-none transition', tab === 'video' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-700 hover:text-slate-900', !hasVideo ? 'opacity-50 cursor-not-allowed' : ''].join(' ')}>
            <PlayCircle size={14} />
            Video
            {tab === 'video' && <span className='absolute inset-x-2 -bottom-[6px] h-[2px] rounded-full bg-slate-900/80' />}
          </button>
        </div>
      )}

      {/* Media frame */}
      <div className={['relative w-full overflow-hidden rounded-lg', 'bg-white/60 backdrop-blur-xl ring-1 ring-black/5 shadow-sm'].join(' ')}>
        <div className='relative w-full h-full'>
          <div className='aspect-[16/9] grid place-items-center'>
            {tab === 'image' && hasImg ? (
              <Img src={exercise.img} alt={exercise?.name || 'Exercise Image'} className='h-full w-full object-contain' draggable={false} loading='eager' />
            ) : tab === 'video' && hasVideo ? (
              <video src={exercise?.video?.startsWith('http') ?  exercise?.video : baseImg + exercise?.video} controls className='h-full max-h-[400px] w-full object-contain rounded-lg' preload='metadata' />
            ) : (
              <div className='flex flex-col items-center justify-center gap-1 p-6 text-center'>
                <div className='grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400'>{tab === 'image' ? <ImageIcon size={20} /> : <PlayCircle size={20} />}</div>
                <p className='text-sm text-slate-500'>No {tab === 'image' ? 'image' : 'video'} available</p>
              </div>
            )}
          </div>
        </div>

        {/* Disabled hint overlay if active tab has no media */}
        {activeTabDisabled && (
          <div className='pointer-events-none absolute inset-0 grid place-items-center bg-white/60'>
            <span className='rounded-lg bg-white px-3 py-1.5 text-xs text-slate-600 ring-1 ring-slate-200 shadow-sm'>{tab === 'image' ? 'No image' : 'No video'}</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2'>
            <h3 className='text-lg font-semibold text-slate-900 truncate'>{exercise?.name || 'Untitled Exercise'}</h3>
            {exercise?.category ? (
              <span className='inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700'>
                <TagIcon size={12} />
                {exercise.category}
              </span>
            ) : null}
          </div>

          {/* Details text */}
          {exercise?.details ? <p className='mt-1 max-w-prose text-sm leading-6 text-slate-600'>{exercise.details}</p> : null}

          {/* Stats */}
          <div className='mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-slate-700'>
            <StatPill label='Sets' value={exercise?.targetSets ?? 3} />
            <StatPill label='Rest' value={`${exercise?.rest ?? 90}s`} />
            {exercise?.tempo ? <StatPill label='Tempo' value={exercise.tempo} /> : null}
          </div>

          {/* Muscles */}
          {(primary.length > 0 || secondary.length > 0) && (
            <div className='pt-3'>
              <div className='mb-1 text-xs font-medium text-slate-500'>Muscles</div>
              <div className='flex flex-wrap gap-1.5'>
                {primary.map(m => (
                  <Chip key={`p-${m}`}>{m}</Chip>
                ))}
                {secondary.map(m => (
                  <Chip key={`s-${m}`}>{m}</Chip>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
