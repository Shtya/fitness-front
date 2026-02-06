'use client';

import { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, PencilLine, LayoutGrid, Rows, Eye, Trash2, Layers,
  Settings, RefreshCcw, Clock, X, Tag, Search, Play,
  Image as ImageIcon, PlayCircle, TagIcon
} from 'lucide-react';

import api, { baseImg } from '@/utils/axios';
import { Modal, StatCard, TabsPill } from '@/components/dashboard/ui/UI';
import Img from '@/components/atoms/Img';
import Button from '@/components/atoms/Button';
import Select from '@/components/atoms/Select';
import { Notification } from '@/config/Notification';
import { ExerciseForm } from '@/components/pages/dashboard/workouts/ExerciseForm';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import { PrettyPagination } from '@/components/dashboard/ui/Pagination';
import { useLocale, useTranslations } from 'next-intl';
import MultiLangText from '@/components/atoms/MultiLangText';
import { useUser } from '@/hooks/useUser';
import { useTheme } from '@/app/[locale]/theme';

const spring = { type: 'spring', stiffness: 360, damping: 30, mass: 0.7 };

export const categoryMap = {
  Arms: 'الذراعين', Back: 'الظهر', Calves: 'عضلات الساق', Cardio: 'تمارين القلب',
  Chest: 'الصدر', Core: 'الوسط / البطن', Forearms: 'الساعدين', 'Full Body': 'جسم كامل',
  General: 'عام', 'Glutes & Hamstrings': 'المؤخرة وأوتار الركبة', Legs: 'الساقين',
  Other: 'أخرى', 'Quads & Hamstrings': 'عضلات الفخذ الأمامية والخلفية', Shoulders: 'الكتفين',
  Abs: 'عضلات البطن', Biceps: 'عضلات البايسبس', Triceps: 'عضلات الترايسبس',
  Neck: 'الرقبة', Hips: 'الوركين', Thighs: 'الفخذين', 'Lower Body': 'الجزء السفلي',
  'Upper Body': 'الجزء العلوي', 'Lower Back': 'أسفل الظهر', 'Upper Back': 'أعلى الظهر',
  Mobility: 'مرونة الحركة', Stretching: 'تمارين الإطالة', Strength: 'القوة',
  Power: 'القوة الانفجارية', HIIT: 'تدريب عالي الكثافة', Pilates: 'البيلاتس',
  Yoga: 'اليوغا', Meditation: 'التأمل', Warmup: 'الإحماء', Cooldown: 'التهدئة',
  Balance: 'التوازن', Functional: 'اللياقة الوظيفية', Plyometrics: 'البليومتريكس',
  Stability: 'الاستقرار', Endurance: 'التحمل', Aerobic: 'تمارين هوائية',
  Anaerobic: 'تمارين لا هوائية', Flexibility: 'المرونة', Strengthening: 'تقوية العضلات',
  Treadmill: 'جهاز المشي', Elliptical: 'جهاز الإليبتكال', Rowing: 'جهاز التجديف',
  Cycling: 'الدراجة الثابتة', 'Stair Climber': 'جهاز صعود الدرج',
  Running: 'الجري', Walking: 'المشي', Swimming: 'السباحة', Boxing: 'الملاكمة',
  MartialArts: 'الفنون القتالية',
};

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
const Chip = memo(({ children }) => (
  <span
    className='inline-flex items-center rounded-lg px-2.5 py-1 mr-1 mb-1 text-[11px] font-medium transition-all duration-150'
    style={{
      background: 'var(--color-secondary-100)',
      color: 'var(--color-secondary-700)',
    }}>
    {children}
  </span>
));

const IconBtn = memo(({ title, onClick, danger, children }) => (
  <button
    type='button'
    title={title}
    onClick={onClick}
    aria-label={title}
    className='size-8 grid place-content-center rounded-lg border shadow-sm active:scale-90 transition-all duration-150'
    style={
      danger
        ? { borderColor: '#fecaca', background: 'white', color: '#e11d48' }
        : { borderColor: 'var(--color-primary-200)', background: 'white', color: 'var(--color-primary-700)' }
    }>
    {children}
  </button>
));

const StatPill = memo(({ label, value }) => (
  <span
    className='inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-xs'
    style={{
      borderColor: 'var(--color-primary-200)',
      background: 'var(--color-primary-50)',
      color: 'var(--color-primary-700)',
    }}>
    <span className='font-semibold' style={{ color: 'var(--color-primary-800)' }}>{label}</span>
    <span className='opacity-75'>{value}</span>
  </span>
));

/* ------------------------------ Main Component ----------------------------- */
export default function ExercisesPage() {
  const t = useTranslations('workouts');
  const user = useUser();
  const { colors } = useTheme();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState('all');

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [searchText, setSearchText] = useState('');
  const debounced = useDebounced(searchText, 350);

  const [preview, setPreview] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [duplicateInitial, setDuplicateInitial] = useState(null);

  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const reqId = useRef(0);
  const abortControllerRef = useRef(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/plan-exercises/categories');
      const cats = Array.isArray(res.data) ? res.data.filter(Boolean) : [];
      setCategories(cats);
    } catch { setCategories([]); }
  }, []);

  const fetchList = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    setErr(null);
    setLoading(true);
    const myId = ++reqId.current;
    try {
      const params = { page, limit: perPage, sortBy, sortOrder };
      if (debounced) params.search = debounced;
      if (activeCat && activeCat !== 'all') params.category = activeCat;

      const res = await api.get(user.role == 'admin' ? '/plan-exercises' : `/plan-exercises?user_id=${user.adminId}`, {
        params, signal: abortControllerRef.current.signal,
      });
      const data = res.data || {};
      let records = [], totalRecords = 0, serverPerPage = perPage;

      if (Array.isArray(data.records)) {
        records = data.records;
        totalRecords = Number(data.total_records || data.records.length || 0);
        serverPerPage = Number(data.per_page || perPage);
      } else if (Array.isArray(data)) {
        records = data; totalRecords = data.length;
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
      setErr(e?.response?.data?.message || t('errors.loadExercises'));
    } finally {
      if (myId === reqId.current) setLoading(false);
    }
  }, [page, debounced, sortBy, sortOrder, perPage, activeCat, t, user.adminId, user.role]);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const params = {};
      if (debounced) params.search = debounced;
      if (activeCat && activeCat !== 'all') params.category = activeCat;
      const res = await api.get('/plan-exercises/stats', { params });
      setStats(res.data);
    } catch {} finally { setLoadingStats(false); }
  }, [debounced, activeCat]);

  useEffect(() => { setPage(1); }, [debounced, sortBy, sortOrder, perPage, activeCat]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => () => { if (abortControllerRef.current) abortControllerRef.current.abort(); }, []);

  const toggleSort = useCallback(field => {
    if (sortBy === field) setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
    else { setSortBy(field); setSortOrder('ASC'); }
  }, [sortBy]);

  /* ----------------------------- CRUD Handlers ---------------------------- */
  const askDelete = useCallback(id => { setDeleteId(id); setDeleteOpen(true); }, []);
  const locale = useLocale();
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/plan-exercises/${deleteId}?lang=${locale}`);
      setItems(arr => arr.filter(x => x.id !== deleteId));
      setTotal(tot => Math.max(0, tot - 1));
      Notification(t('toasts.deleted'), 'success');
    } catch (e) {
      Notification(e?.response?.data?.message || t('errors.deleteFailed'), 'error');
    } finally { setDeleteId(null); setDeleteLoading(false); }
  }, [deleteId, t, locale]);

  const createOrUpdate = useCallback(async ({ id, payload }) => {
    const body = {
      name: payload.name, userId: payload.userId,
      details: payload.details || null, category: payload.category || null,
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

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / Math.max(1, perPage))), [total, perPage]);

  const tabs = useMemo(() => {
    const base = [{ key: 'all', label: t('filters.all') }];
    return base.concat((categories || []).map(c => ({
      key: c, label: locale === 'ar' ? categoryMap[c] || c : c,
    })));
  }, [categories, t, locale]);

  const handleAddSubmit = useCallback(async payload => {
    try {
      const saved = await createOrUpdate({ payload });
      setItems(arr => [saved, ...arr]);
      setTotal(tot => tot + 1);
      setAddOpen(false);
      setDuplicateInitial(null);
      Notification(t('toasts.created'), 'success');
      if (saved?.category && !categories.includes(saved.category))
        setCategories(prev => [...prev, saved.category].sort());
    } catch (e) {
      Notification(e?.response?.data?.message || t('errors.createFailed'), 'error');
    }
  }, [createOrUpdate, categories, t]);

  const handleEditSubmit = useCallback(async payload => {
    try {
      const saved = await createOrUpdate({ id: editRow.id, payload });
      setItems(arr => arr.map(e => (e.id === editRow.id ? saved : e)));
      setEditRow(null);
      Notification(t('toasts.updated'), 'success');
      if (saved?.category && !categories.includes(saved.category))
        setCategories(prev => [...prev, saved.category].sort());
    } catch (e) {
      Notification(e?.response?.data?.message || t('errors.updateFailed'), 'error');
    }
  }, [createOrUpdate, editRow, categories, t]);

  const handleDuplicate = useCallback(exercise => {
    if (!exercise) return;
    const { id, ...rest } = exercise;
    setDuplicateInitial(rest);
    setAddOpen(true);
  }, []);

  return (
    <div className='space-y-6'>
      {/* Header / Stats */}
      <GradientStatsHeader
        onClick={() => { setDuplicateInitial(null); setAddOpen(true); }}
        btnName={t('actions.addExercise')}
        title={t('descriptions.exercises')}
        desc={t('descriptions.manageLibrary')}
        loadingStats={loadingStats}>
        <>
          <StatCard icon={Layers} title={t('stats.totalGlobalExercise')} value={stats?.totals?.totalGlobalExercise - stats?.totals?.totalPersonalExercise ?? 0} />
          {stats?.totals?.totalPersonalExercise != null && stats?.totals?.totalPersonalExercise != '0' && (
            <StatCard icon={Layers} title={t('stats.totalPersonalExercise')} value={stats?.totals?.totalPersonalExercise ?? 0} />
          )}
          <StatCard icon={Settings} title={t('stats.withVideo')} value={stats?.totals?.withVideo || 0} />
          <StatCard icon={RefreshCcw} title={t('stats.withImage')} value={stats?.totals?.withImage || 0} />
        </>
      </GradientStatsHeader>

      {/* Filters + Search */}
      <div className='relative'>
        <div className='flex items-center justify-between gap-2 flex-wrap'>
          {/* Search */}
          <div className='relative flex-1 max-w-[240px] sm:min-w-[260px]'>
            <Search className='absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none' style={{ color: 'var(--color-primary-400)' }} />
            <style>{`
              .themed-search:focus {
                border-color: var(--color-primary-500) !important;
                box-shadow: 0 0 0 3px rgba(var(--search-ring, 99,102,241), 0.2), 0 1px 3px rgba(0,0,0,0.06) !important;
              }
            `}</style>
            <input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder={t('placeholders.search')}
              className='themed-search h-11 w-full px-8 rounded-xl border text-sm outline-none transition-all duration-200'
              style={{
                borderColor: 'var(--color-primary-200)',
                background: 'white',
                color: 'var(--color-primary-900)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
              aria-label={t('placeholders.search')}
            />
            {!!searchText && (
              <button
                type='button'
                onClick={() => setSearchText('')}
                className='absolute rtl:left-2 ltr:right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-150'
                style={{ color: 'var(--color-primary-400)' }}
                aria-label={t('actions.clear')}
                title={t('actions.clear')}>
                <X className='w-4 h-4' />
              </button>
            )}
          </div>

          <div className='flex items-center gap-2'>
            {/* Per page */}
            <div className='min-w-[80px]'>
              <Select
                searchable={false}
                clearable={false}
                className='!w-full'
                placeholder={t('placeholders.perPage')}
                options={[
                  { id: 8, label: 8 }, { id: 12, label: 12 },
                  { id: 20, label: 20 }, { id: 30, label: 30 },
                ]}
                value={perPage}
                onChange={n => setPerPage(Number(n))}
              />
            </div>

            {/* Sort button */}
            <button
              onClick={() => toggleSort('created_at')}
              className='inline-flex items-center gap-2 rounded-xl px-3 h-11 text-sm font-medium transition-all duration-200 active:scale-[.97]'
              style={{
                borderWidth: 1,
                borderColor: 'var(--color-primary-200)',
                background: 'white',
                color: 'var(--color-primary-800)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
              <Clock size={17} style={{ color: 'var(--color-primary-500)' }} />
              <span className='tracking-wide'>
                {sortBy === 'created_at'
                  ? (sortOrder === 'ASC' ? t('actions.oldestFirst') : t('actions.newestFirst'))
                  : t('actions.sortByDate')}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      {tabs?.length > 1 && (
        <div>
          <TabsPill id='exercise-cats' className='!bg-white' tabs={tabs} active={activeCat} onChange={key => setActiveCat(key)} />
        </div>
      )}

      {/* Error banner */}
      {err ? (
        <div className='p-3 rounded-xl border text-sm' style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }}>
          {err}
        </div>
      ) : null}

      {/* Grid */}
      <GridView t={t} loading={loading} items={items} onView={setPreview} onEdit={setEditRow} onDelete={askDelete} onDuplicate={handleDuplicate} />

      <PrettyPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Preview Modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || t('titles.preview')} maxW='max-w-3xl'>
        {preview && <ExercisePreview t={t} exercise={preview} />}
      </Modal>

      {/* Add / Duplicate Modal */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setDuplicateInitial(null); }} title={t('titles.addExercise')}>
        <ExerciseForm categories={categories} initial={duplicateInitial || null} onSubmit={handleAddSubmit} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={t('titles.editExercise', { name: editRow?.name || '' })}>
        {editRow && <ExerciseForm categories={categories} initial={editRow} onSubmit={handleEditSubmit} />}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        t={t}
        loading={deleteLoading}
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteId(null); }}
        title={t('confirm.deleteTitle')}
        message={t('confirm.deleteMsg')}
        confirmText={t('confirm.deleteBtn')}
        onConfirm={handleDelete}
      />
    </div>
  );
}

/* ---------------------------- Subcomponents ---------------------------- */
const ConfirmDialog = memo(({ open, onClose, loading, title, message, onConfirm, confirmText, t }) => (
  <Modal open={open} onClose={onClose} title={title} maxW='max-w-md'>
    <div className='space-y-4'>
      {message ? <p className='text-sm' style={{ color: 'var(--color-primary-600)' }}>{message}</p> : null}
      <div className='flex items-center justify-end gap-2'>
        <Button
          name={confirmText}
          loading={loading}
          color='danger'
          className='!w-fit'
          onClick={() => { onConfirm?.(); onClose?.(); }}
        />
      </div>
    </div>
  </Modal>
));

/* ----------------------------- Grid / Cards -------------------------------- */
const GridView = memo(({ loading, items, onView, onEdit, onDelete, onDuplicate, t }) => {
  if (loading) {
    return (
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className='relative overflow-hidden rounded-xl border shadow-sm' style={{ borderColor: 'var(--color-primary-200)', background: 'white' }}>
            <div className='aspect-video w-full overflow-hidden'>
              <div className='h-full w-full animate-shimmer' style={{ background: 'linear-gradient(90deg, var(--color-primary-50) 25%, var(--color-primary-100) 50%, var(--color-primary-50) 75%)', backgroundSize: '200% 100%' }} />
            </div>
            <div className='p-4 space-y-2.5'>
              <div className='h-4 w-4/5 rounded-lg animate-shimmer' style={{ background: 'linear-gradient(90deg, var(--color-primary-100) 25%, var(--color-primary-200) 50%, var(--color-primary-100) 75%)', backgroundSize: '200% 100%' }} />
              <div className='h-3 w-2/3 rounded-lg animate-shimmer' style={{ background: 'linear-gradient(90deg, var(--color-primary-100) 25%, var(--color-primary-200) 50%, var(--color-primary-100) 75%)', backgroundSize: '200% 100%' }} />
              <div className='h-3 w-1/2 rounded-lg animate-shimmer' style={{ background: 'linear-gradient(90deg, var(--color-primary-100) 25%, var(--color-primary-200) 50%, var(--color-primary-100) 75%)', backgroundSize: '200% 100%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className='rounded-xl border p-12 text-center shadow-sm' style={{ borderColor: 'var(--color-primary-200)', background: 'white' }}>
        <div className='mx-auto w-16 h-16 rounded-xl grid place-content-center' style={{ background: 'var(--color-primary-50)' }}>
          <Dumbbell className='w-8 h-8' style={{ color: 'var(--color-primary-500)' }} />
        </div>
        <h3 className='mt-4 text-lg font-semibold' style={{ color: 'var(--color-primary-800)' }}>{t('empty.title')}</h3>
        <p className='text-sm mt-1' style={{ color: 'var(--color-primary-500)' }}>{t('empty.subtitle')}</p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
      {items.map(e => {
        const hasImg = Boolean(e.img);
        const hasVideo = Boolean(e.video);
        const sets = e.targetSets ?? 3;
        const rest = e.rest ?? 90;

        return (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={spring}
            className='group relative overflow-hidden rounded-xl border shadow-sm transition-shadow duration-300 hover:shadow-md'
            style={{ borderColor: 'var(--color-primary-200)', background: 'white' }}>

            {/* Hover gradient glow border */}
            <div
              className='pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300'
              style={{
                background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                WebkitMaskImage: 'linear-gradient(#000 50%, transparent)',
                maskImage: 'linear-gradient(#000 50%, transparent)',
                opacity: 0,
              }}
            />
            <style>{`
              .card-glow:hover .card-glow-inner {
                opacity: 0.12 !important;
              }
            `}</style>
            <div className='card-glow-inner pointer-events-none absolute inset-0 rounded-xl transition-opacity duration-300' style={{
              background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
              opacity: 0,
            }} />

            {/* Media Thumb */}
            <div className='card-glow relative aspect-[16/8] ' style={{ background: 'var(--color-primary-50)' }}>
              {hasImg ? (
                <Img showBlur={false} src={e.img} alt={e.name} className='w-full h-full object-contain' loading='lazy' />
              ) : (
                <div className='w-full h-full grid place-content-center' style={{ color: hasVideo ? 'var(--color-primary-400)' : 'var(--color-primary-300)' }}>
                  <Play className='w-9 h-9' />
                </div>
              )}

              {/* Action toolbar */}
              <div className='absolute right-2 top-2'>
                <div className='flex flex-col items-center gap-1 rounded-xl border px-1 py-1 shadow-md backdrop-blur-sm transition-all duration-200' style={{ background: 'rgba(255,255,255,0.92)', borderColor: 'var(--color-primary-200)' }}>
                  <IconBtn title={t('actions.view')} onClick={() => onView?.(e)}>
                    <Eye className='w-4 h-4' style={{ color: 'var(--color-primary-600)' }} />
                  </IconBtn>
                  {e?.adminId != null && (
                    <IconBtn title={t('actions.edit')} onClick={() => onEdit?.(e)}>
                      <PencilLine className='w-4 h-4' style={{ color: 'var(--color-primary-600)' }} />
                    </IconBtn>
                  )}
                  <IconBtn title='Duplicate' onClick={() => onDuplicate?.(e)}>
                    <Layers className='w-4 h-4' style={{ color: 'var(--color-secondary-600)' }} />
                  </IconBtn>
                  {e?.adminId != null && (
                    <IconBtn title={t('actions.delete')} onClick={() => onDelete?.(e.id)} danger>
                      <Trash2 className='w-4 h-4' />
                    </IconBtn>
                  )}
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className='p-4 space-y-2'>
              <div className=' font-en font-semibold leading-5  ' title={e.name} style={{ color: 'var(--color-primary-900)' }}>
                {e.name}
              </div>

              {e.category ? (
                <span
                  className='inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm'
                  style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}>
                  <Tag size={11} />
                  <MultiLangText>{e.category}</MultiLangText>
                </span>
              ) : null}

              {e.details ? (
                <MultiLangText dir='ltr' className='text-sm line-clamp-1' style={{ color: 'var(--color-primary-500)' }}>
                  {e.details}
                </MultiLangText>
              ) : null}

              <div className='flex flex-wrap items-center gap-2 pt-1'>
                <span className='text-[11px] rounded-lg border px-2 py-1' style={{ borderColor: 'var(--color-primary-200)', color: 'var(--color-primary-600)', background: 'var(--color-primary-50)' }}>
                  {t('meta.sets')} <span className='font-semibold' style={{ color: 'var(--color-primary-800)' }}>/ {sets}</span>
                </span>
                <span className='text-[11px] rounded-lg border px-2 py-1' style={{ borderColor: 'var(--color-primary-200)', color: 'var(--color-primary-600)', background: 'var(--color-primary-50)' }}>
                  {t('meta.rest')} <span className='font-semibold' style={{ color: 'var(--color-primary-800)' }}>{rest}s</span>
                </span>
                {e.tempo ? (
                  <span className='text-[11px] rounded-lg border px-2 py-1' style={{ borderColor: 'var(--color-primary-200)', color: 'var(--color-primary-600)', background: 'var(--color-primary-50)' }}>
                    {t('meta.tempo')} <span className='font-semibold' style={{ color: 'var(--color-primary-800)' }}>{e.tempo}</span>
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

/* ----------------------------- Preview Modal ------------------------------- */
const ExercisePreview = memo(({ exercise, baseMedia = '', t }) => {
  const hasImg = !!exercise?.img;
  const hasVideo = !!exercise?.video;
  const [tab, setTab] = useState(hasImg ? 'image' : 'video');

  useEffect(() => { setTab(hasImg ? 'image' : 'video'); }, [exercise?.id, hasImg, hasVideo]);

  const primary = useMemo(() => exercise?.primaryMusclesWorked || [], [exercise]);
  const secondary = useMemo(() => exercise?.secondaryMusclesWorked || [], [exercise]);
  const activeTabDisabled = (tab === 'image' && !hasImg) || (tab === 'video' && !hasVideo);

  return (
    <div className='space-y-5'>
      {/* Media Tabs */}
      {(hasImg || hasVideo) && (
        <div className='inline-flex items-center gap-1.5 rounded-xl p-1' style={{ background: 'var(--color-primary-50)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)' }}>
          {['image', 'video'].map(key => {
            const isActive = tab === key;
            const isDisabled = key === 'image' ? !hasImg : !hasVideo;
            const Icon = key === 'image' ? ImageIcon : PlayCircle;
            return (
              <button
                key={key}
                type='button'
                aria-pressed={isActive}
                disabled={isDisabled}
                onClick={() => setTab(key)}
                className='relative inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm rounded-lg outline-none transition-all duration-200'
                style={{
                  background: isActive ? 'white' : 'transparent',
                  color: isActive ? 'var(--color-primary-800)' : 'var(--color-primary-500)',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  opacity: isDisabled ? 0.45 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                }}>
                <Icon size={14} />
                {t('media.' + key)}
                {isActive && <span className='absolute inset-x-3 -bottom-[5px] h-[2px] rounded-full' style={{ background: 'var(--color-primary-500)' }} />}
              </button>
            );
          })}
        </div>
      )}

      {/* Media Frame */}
      <div className='relative w-full overflow-hidden rounded-xl shadow-sm' style={{ background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)' }}>
        <div className='aspect-[16/9] grid place-items-center'>
          {tab === 'image' && hasImg ? (
            <Img src={exercise.img} alt={exercise?.name || t('titles.untitled')} className='h-full w-full object-contain' draggable={false} loading='eager' />
          ) : tab === 'video' && hasVideo ? (
            <video
              src={exercise?.video?.startsWith('http') ? exercise?.video : baseImg + exercise?.video}
              controls className='h-full max-h-[400px] w-full object-contain rounded-xl' preload='metadata' />
          ) : (
            <div className='flex flex-col items-center justify-center gap-2 p-6 text-center'>
              <div className='grid h-14 w-14 place-items-center rounded-xl' style={{ background: 'var(--color-primary-100)' }}>
                {tab === 'image'
                  ? <ImageIcon size={22} style={{ color: 'var(--color-primary-400)' }} />
                  : <PlayCircle size={22} style={{ color: 'var(--color-primary-400)' }} />}
              </div>
              <p className='text-sm' style={{ color: 'var(--color-primary-500)' }}>
                {t('media.none', { kind: tab === 'image' ? t('media.image') : t('media.video') })}
              </p>
            </div>
          )}
        </div>

        {activeTabDisabled && (
          <div className='pointer-events-none absolute inset-0 grid place-items-center' style={{ background: 'rgba(255,255,255,0.65)' }}>
            <span className='rounded-lg px-3 py-1.5 text-xs shadow-sm' style={{ background: 'white', color: 'var(--color-primary-600)', border: '1px solid var(--color-primary-200)' }}>
              {tab === 'image' ? t('media.noImage') : t('media.noVideo')}
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2 flex-wrap'>
            <h3 className='text-lg font-bold truncate' style={{ color: 'var(--color-primary-900)' }}>
              {exercise?.name || t('titles.untitled')}
            </h3>
            {exercise?.category ? (
              <span
                className='inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-xs font-semibold'
                style={{
                  borderColor: 'var(--color-primary-200)',
                  background: 'var(--color-primary-50)',
                  color: 'var(--color-primary-700)',
                }}>
                <TagIcon size={11} />
                {exercise.category}
              </span>
            ) : null}
          </div>

          {exercise?.details ? (
            <p className='mt-1.5 max-w-prose text-sm leading-6' style={{ color: 'var(--color-primary-600)' }}>
              {exercise.details}
            </p>
          ) : null}

          <div className='mt-2 flex flex-wrap items-center gap-2'>
            <StatPill label={t('meta.sets')} value={exercise?.targetSets ?? 3} />
            <StatPill label={t('meta.rest')} value={`${exercise?.rest ?? 90}s`} />
            {exercise?.tempo ? <StatPill label={t('meta.tempo')} value={exercise.tempo} /> : null}
          </div>

          {(primary.length > 0 || secondary.length > 0) && (
            <div className='pt-4'>
              <div className='mb-1.5 text-xs font-semibold uppercase tracking-wide' style={{ color: 'var(--color-primary-400)' }}>
                {t('labels.muscles')}
              </div>
              <div className='flex flex-wrap gap-1.5'>
                {primary.map(m => <Chip key={`p-${m}`}>{m}</Chip>)}
                {secondary.map(m => <Chip key={`s-${m}`}>{m}</Chip>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});