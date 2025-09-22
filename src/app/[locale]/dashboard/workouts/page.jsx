'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Plus, Search as SearchIcon, LayoutGrid, Rows, Eye, Pencil, Trash2, CheckCircle2, XCircle, Layers, Settings, RefreshCcw, Clock, ChevronUp, ChevronDown, Play, Image as ImageIcon, Video as VideoIcon, Link as LinkIcon, Hash } from 'lucide-react';

import api, { baseImg } from '@/utils/axios';
import { Modal, StatCard, StatusPill, PageHeader } from '@/components/dashboard/ui/UI';
import { Badge } from '@/components/site/UI';

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

const toArray = v => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return String(v)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
};

const normStatus = s => {
  const t = String(s || '').toUpperCase();
  if (['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED'].includes(t)) return t[0] + t.slice(1).toLowerCase();
  return 'Active';
};

const buildMultipartIfNeeded = payload => {
  const hasFile = payload.imgFile || payload.videoFile;
  if (!hasFile) return null; // send JSON if no files
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

/* ------------------------------ Main Component ----------------------------- */
export default function ExercisesPage() {
  // list + stats
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // server paging/sort/search
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('created_at'); // backend field
  const [sortOrder, setSortOrder] = useState('DESC');
  const [searchText, setSearchText] = useState('');
  const debounced = useDebounced(searchText, 350);

  // ui
  const [view, setView] = useState('grid'); // grid | list
  const [preview, setPreview] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  // race guard
  const reqId = useRef(0);

  const fetchList = async ({ reset = false } = {}) => {
    setErr(null);
    if (reset) setLoading(true);
    const myId = ++reqId.current;
    try {
      const params = { page, limit, sortBy, sortOrder };
      if (debounced) params.search = debounced;

      const res = await api.get('/plan-exercises', { params });
      const data = res.data || {};

      let records = [];
      let totalRecords = 0;
      if (Array.isArray(data.records)) {
        records = data.records;
        totalRecords = Number(data.total_records || data.records.length || 0);
      } else if (Array.isArray(data)) {
        records = data;
        totalRecords = data.length;
      } else if (Array.isArray(data.items)) {
        records = data.items;
        totalRecords = Number(data.total || data.items.length || 0);
      }

      if (myId !== reqId.current) return;
      setTotal(totalRecords);
      setItems(prev => (reset ? records : [...prev, ...records]));
    } catch (e) {
      if (myId !== reqId.current) return;
      setErr(e?.response?.data?.message || 'Failed to load exercises');
    } finally {
      if (myId === reqId.current) setLoading(false);
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const params = {};
      if (debounced) params.search = debounced;
      const res = await api.get('/plan-exercises/stats', { params });
      setStats(res.data);
    } catch (e) {
      // non-blocking
    } finally {
      setLoadingStats(false);
    }
  };

  // reset list when search/sort changes
  useEffect(() => {
    setItems([]);
    setPage(1);
  }, [debounced, sortBy, sortOrder]);

  useEffect(() => {
    fetchList({ reset: page === 1 });
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debounced, sortBy, sortOrder]);

  const hasMore = items.length < total;

  const toggleSortNewest = () => {
    if (sortBy === 'created_at') setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
    else {
      setSortBy('created_at');
      setSortOrder('DESC');
    }
  };

  /* ----------------------------- CRUD Handlers ---------------------------- */
  const handleDelete = async id => {
    if (!confirm('Delete this exercise?')) return;
    try {
      await api.delete(`/plan-exercises/${id}`);
      setItems(arr => arr.filter(x => x.id !== id));
      setTotal(t => Math.max(0, t - 1));
    } catch (e) {
      alert(e?.response?.data?.message || 'Delete failed');
    }
  };

  const createOrUpdate = async ({ id, payload }) => {
    const body = {
      // primitives/strings
      name: payload.name,
      targetReps: payload.targetReps || '10',
      orderIndex: Number(payload.orderIndex ?? 0),
      desc: payload.desc || '',
      equipment: payload.equipment || '',
      targetSets: Number(payload.targetSets || 3),
      restSeconds: Number(payload.restSeconds || 90),
      status: payload.status || 'Active',
      // arrays
      primaryMuscles: toArray(payload.primaryMuscles),
      secondaryMuscles: toArray(payload.secondaryMuscles),
      alternatives: toArray(payload.alternatives),
      // day relation
      dayId: payload.dayId || undefined,
      // media
      img: payload.imgUrl || undefined,
      video: payload.videoUrl || undefined,
      imgFile: payload.imgFile || undefined,
      videoFile: payload.videoFile || undefined,
    };

    const fd = buildMultipartIfNeeded(body);
    const url = id ? `/plan-exercises/${id}` : '/plan-exercises';
    const method = id ? 'put' : 'post';
    const res = await api[method](url, fd || body, fd ? undefined : { headers: { 'Content-Type': 'application/json' } });
    return res.data;
  };

  /* --------------------------------- UI ---------------------------------- */
  return (
    <div className='space-y-6'>
      {/* Header / Stats */}
      <div className='rounded-xl md:rounded-2xl overflow-hidden border border-indigo-200'>
        <div className='relative p-4 md:p-8 bg-gradient text-white'>
          <div className='absolute inset-0 opacity-20 bg-[radial-gradient(600px_200px_at_20%_-20%,white,transparent)]' />
          <div className='relative z-10 flex flex-row md:items-center gap-3 md:gap-6 justify-between'>
            <PageHeader icon={Dumbbell} title='Exercises' subtitle='Manage your gym’s exercise library.' />
            <button onClick={() => setAddOpen(true)} className='cursor-pointer hover:scale-[.95] duration-300 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white'>
              <Plus className='w-4 h-4' /> Add Exercise
            </button>
          </div>

          <div className='flex items-center justify-start gap-3 mt-6'>
            {loadingStats ? (
              <KpiSkeleton />
            ) : (
              <>
                <StatCard className='max-w-[220px] w-full' icon={Layers} title='Total' value={stats?.totals?.total || 0} sub={`${stats?.totals?.linkedToDay || 0} linked to day`} />
                <StatCard className='max-w-[220px] w-full' icon={CheckCircle2} title='Active' value={stats?.totals?.active || 0} sub={`${Math.round(((stats?.totals?.active || 0) / Math.max(1, stats?.totals?.total || 1)) * 100)}%`} />
                <StatCard className='max-w-[220px] w-full' icon={Settings} title='With Video' value={stats?.totals?.withVideo || 0} />
                <StatCard className='max-w-[220px] w-full' icon={RefreshCcw} title='With Image' value={stats?.totals?.withImage || 0} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Controls: Search + Sort + View */}
      <div className='flex items-center gap-2 mt-12 flex-wrap'>
        <div className='relative w-full md:w-72'>
          <SearchIcon className='absolute left-3 z-[10] top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
          <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder='Search name, muscles, equipment…' className='h-[40px] w-full pl-10 pr-3 rounded-xl bg-white text-black border border-slate-300 font-medium text-sm shadow-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-indigo-500/40 hover:border-indigo-400 transition' />
        </div>

        <button onClick={toggleSortNewest} className='bg-white inline-flex items-center h-[40px] gap-2 px-4 py-2 rounded-xl text-black border border-slate-300 font-medium text-sm backdrop-blur-md active:scale-[.97] transition'>
          <Clock size={16} />
          <span>Newest</span>
          {sortBy === 'created_at' ? sortOrder === 'ASC' ? <ChevronUp className='w-4 h-4 text-black' /> : <ChevronDown className='w-4 h-4 text-black' /> : null}
        </button>

        <button onClick={() => setView(v => (v === 'grid' ? 'list' : 'grid'))} className='bg-white inline-flex items-center h-[40px] gap-2 px-4 py-2 rounded-xl text-black border border-slate-300 font-medium text-sm backdrop-blur-md active:scale-[.97] transition'>
          {view === 'grid' ? <Rows size={16} /> : <LayoutGrid size={16} />}
          <span>{view === 'grid' ? 'List' : 'Grid'}</span>
        </button>
      </div>

      {/* Errors */}
      {err ? <div className='p-3 rounded-xl bg-red-50 text-red-700 border border-red-100'>{err}</div> : null}

      {/* Content */}
      {view === 'grid' ? <GridView loading={loading && page === 1} items={items} onView={setPreview} onEdit={setEditRow} onDelete={handleDelete} /> : <ListView loading={loading && page === 1} items={items} onView={setPreview} onEdit={setEditRow} onDelete={handleDelete} />}

      {/* Load more */}
      <div className='flex justify-center py-2'>{loading && page > 1 ? <ButtonGhost disabled>Loading…</ButtonGhost> : items.length < total ? <ButtonGhost onClick={() => setPage(p => p + 1)}>Load more</ButtonGhost> : null}</div>

      {/* Preview */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || 'Preview'} maxW='max-w-3xl'>
        {preview && <ExercisePreview exercise={preview} />}
      </Modal>

      {/* Add */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title='Add Exercise'>
        <ExerciseForm
          onSubmit={async payload => {
            try {
              const saved = await createOrUpdate({ payload });
              setItems(arr => [saved, ...arr]);
              setTotal(t => t + 1);
              setAddOpen(false);
            } catch (e) {
              alert(e?.response?.data?.message || 'Create failed');
            }
          }}
        />
      </Modal>

      {/* Edit */}
      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Edit: ${editRow?.name || ''}`}>
        {editRow && (
          <ExerciseForm
            initial={editRow}
            onSubmit={async payload => {
              try {
                const saved = await createOrUpdate({ id: editRow.id, payload });
                setItems(arr => arr.map(e => (e.id === editRow.id ? saved : e)));
                setEditRow(null);
              } catch (e) {
                alert(e?.response?.data?.message || 'Update failed');
              }
            }}
          />
        )}
      </Modal>

      {/* shimmer styles */}
      <style jsx>{`
        .shimmer {
          position: relative;
          overflow: hidden;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
          background-size: 400% 100%;
          animation: shimmer 1.2s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% {
            background-position: 100% 0;
          }
          100% {
            background-position: 0 0;
          }
        }
      `}</style>
    </div>
  );
}

/* ---------------------------- Subcomponents ---------------------------- */
const IconButton = ({ title, onClick, children, danger = false }) => (
  <button title={title} onClick={onClick} className={`w-[34px] h-[34px] inline-flex items-center justify-center rounded-lg border transition ${danger ? 'border-red-200 bg-white text-red-600 hover:bg-red-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
    {children}
  </button>
);

const ButtonGhost = ({ children, onClick, disabled }) => (
  <button disabled={disabled} onClick={onClick} className='px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 disabled:opacity-60'>
    {children}
  </button>
);

/* 
- here remove the order 
- and also the active 
- and show the img and icon when click on it show the video 
- and also make the actiosn [ show , edit , del] floating in the top right wiht pretty why make the box is small

*/

function GridView({ loading, items, onView, onEdit, onDelete }) {
  const [playingId, setPlayingId] = useState(null);

  if (loading) {
    return (
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3'>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className='card-glow p-4'>
            <div className='aspect-video rounded-xl shimmer mb-3' />
            <div className='h-4 rounded shimmer w-2/3 mb-2' />
            <div className='h-3 rounded shimmer w-1/2' />
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className='card-glow p-10 text-center'>
        <div className='mx-auto w-14 h-14 rounded-2xl bg-slate-100 grid place-content-center'>
          <Dumbbell className='w-7 h-7 text-slate-500' />
        </div>
        <h3 className='mt-4 text-lg font-semibold'>No exercises found</h3>
        <p className='text-sm text-slate-600 mt-1'>Try a different search query or add a new exercise.</p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3'>
      {items.map(e => {
        const canPlay = Boolean(e.video);
        const isPlaying = playingId === e.id;

        return (
          <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='card-glow overflow-hidden p-0 group'>
            {/* Media */}
            <div className='relative aspect-video bg-slate-100'>
              {isPlaying && canPlay ? (
                <video src={ baseImg + e.video} className='w-full h-full object-contain bg-white' autoPlay muted playsInline controls onEnded={() => setPlayingId(null)} />
              ) : e.img ? (
                <img src={ baseImg +  e.img} alt={e.name} className='w-full h-full object-contain bg-white' />
              ) : canPlay ? (
                <div className='w-full h-full grid place-content-center'>
                  <Play className='w-8 h-8 text-slate-400' />
                </div>
              ) : (
                <div className='w-full h-full grid place-content-center'>
                  <Play className='w-8 h-8 text-slate-300' />
                </div>
              )}

              {/* Click overlay to play (only if we have a video and we're not playing) */}
              {canPlay && !isPlaying && (
                <button onClick={() => setPlayingId(e.id)} className='absolute inset-0 grid place-items-center bg-black/0 hover:bg-black/10 transition' aria-label='Play video'>
                  <span className='rounded-full bg-white/90 border border-white/70 shadow px-3 py-2 inline-flex items-center gap-2'>
                    <Play className='w-4 h-4' />
                    <span className='text-xs font-medium'>Play</span>
                  </span>
                </button>
              )}

              {/* Floating actions (top-right) */}
              <div className='absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition'>
                <button title='Show' onClick={() => onView(e)} className='w-9 h-9 grid place-content-center rounded-lg backdrop-blur bg-white/85 hover:bg-white shadow border border-white/60'>
                  <Eye className='w-4 h-4' />
                </button>
                <button title='Edit' onClick={() => onEdit(e)} className='w-9 h-9 grid place-content-center rounded-lg backdrop-blur bg-white/85 hover:bg-white shadow border border-white/60'>
                  <Pencil className='w-4 h-4' />
                </button>
                <button title='Delete' onClick={() => onDelete(e.id)} className='w-9 h-9 grid place-content-center rounded-lg backdrop-blur bg-white/85 hover:bg-white shadow border border-red-200 text-red-600'>
                  <Trash2 className='w-4 h-4' />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className='p-4'>
              <div className='font-semibold'>{e.name}</div>
              <div className='text-xs text-slate-500'>
                {e.equipment || '—'} · Sets {e.targetSets ?? 3} · Rest {e.restSeconds ?? 90}s · Reps {e.targetReps || '—'}
                {e.day?.name ? ` · ${e.day.name}` : ''}
              </div>
              <div className='flex flex-wrap gap-1 mt-2'>
                {(e.primaryMuscles || []).map(m => (
                  <Badge key={m} color='blue'>
                    {m}
                  </Badge>
                ))}
                {(e.secondaryMuscles || []).map(m => (
                  <Badge key={m}>{m}</Badge>
                ))}
              </div>
              {/* Removed order + status per request */}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function ListView({ loading, items, onView, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className='card-glow divide-y divide-transparent'>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className='p-4 flex items-center justify-between gap-3'>
            <div className='flex items-center gap-3 w-full'>
              <div className='w-16 h-10 rounded-lg shimmer' />
              <div className='flex-1'>
                <div className='h-4 shimmer w-40 mb-2 rounded' />
                <div className='h-3 shimmer w-24 rounded' />
              </div>
            </div>
            <div className='w-28 h-6 shimmer rounded' />
          </div>
        ))}
      </div>
    );
  }
  if (!items.length) return <div className='card-glow p-6 text-slate-500'>No exercises.</div>;
  return (
    <div className='card-glow divide-y divide-slate-100'>
      {items.map(e => (
        <div key={e.id} className='p-4 flex items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <div className='w-16 h-10 rounded-lg bg-slate-100 grid place-content-center overflow-hidden'>{e.video ? <video src={ baseImg + e.video} className='w-full h-full object-contain bg-white' muted /> : e.img ? <img src={ baseImg +  e.img} alt={e.name} className='w-full h-full object-contain bg-white' /> : <Play className='w-5 h-5 text-slate-400' />}</div>
            <div>
              <div className='font-medium'>{e.name}</div>
              <div className='text-xs text-slate-500'>
                {e.equipment || '—'} · Sets {e.targetSets ?? 3} · Rest {e.restSeconds ?? 90}s · Reps {e.targetReps || '—'}
                {e.day?.name ? ` · ${e.day.name}` : ''}
              </div>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <StatusPill status={normStatus(e.status)} />
            <IconButton title='View' onClick={() => onView(e)}>
              <Eye className='w-4 h-4' />
            </IconButton>
            <IconButton title='Edit' onClick={() => onEdit(e)}>
              <Pencil className='w-4 h-4' />
            </IconButton>
            <IconButton title='Delete' onClick={() => onDelete(e.id)} danger>
              <Trash2 className='w-4 h-4' />
            </IconButton>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExercisePreview({ exercise }) {
  return (
    <div className='space-y-4'>
      <div className='aspect-video rounded-xl overflow-hidden bg-slate-100 grid place-content-center'>{exercise.video ? <video src={ baseImg + exercise.video} controls className='w-full h-full object-contain bg-white' /> : exercise.img ? <img src={ baseImg + exercise.img} alt={exercise.name} className='w-full h-full object-contain bg-white' /> : <div className='text-slate-400 text-sm'>No media</div>}</div>

      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='text-lg font-semibold'>{exercise.name}</div>
          <div className='text-sm text-slate-600'>
            {exercise.equipment || '—'} · Sets {exercise.targetSets ?? 3} · Reps {exercise.targetReps || '—'} · Rest {exercise.restSeconds ?? 90}s
          </div>
          <div className='text-xs text-slate-500 mt-1'>
            Order {exercise.orderIndex ?? 0}
            {exercise.day?.name ? ` · Day: ${exercise.day.name}` : ''}
          </div>

          <div className='flex flex-wrap gap-1 mt-3'>
            {(exercise.primaryMuscles || []).map(m => (
              <Badge key={m} color='blue'>
                {m}
              </Badge>
            ))}
            {(exercise.secondaryMuscles || []).map(m => (
              <Badge key={m}>{m}</Badge>
            ))}
          </div>
          {(exercise.alternatives || []).length ? <div className='text-xs text-slate-600 mt-2'>Alternatives: {(exercise.alternatives || []).join(', ')}</div> : null}
        </div>
        <StatusPill status={normStatus(exercise.status)} />
      </div>

      {exercise.desc ? <div className='text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200'>{exercise.desc}</div> : null}

      <div className='text-[11px] text-slate-500'>
        Created: {exercise.created_at ? new Date(exercise.created_at).toLocaleString() : '—'} · Updated: {exercise.updated_at ? new Date(exercise.updated_at).toLocaleString() : '—'}
      </div>
    </div>
  );
}

/* -------------------------- Form (Create / Edit) -------------------------- */
function ExerciseForm({ initial, onSubmit }) {
  const [imgUrl, setImgUrl] = useState(initial?.img || '');
  const [videoUrl, setVideoUrl] = useState(initial?.video || '');
  const [imgFile, setImgFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);

  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const payload = {
          name: f.get('name'),
          targetReps: f.get('targetReps') || '10',
          orderIndex: f.get('orderIndex') || 0,
          desc: f.get('desc') || '',
          equipment: f.get('equipment') || '',
          targetSets: f.get('targetSets') || 3,
          restSeconds: f.get('restSeconds') || 90,
          status: f.get('status') || 'Active',
          primaryMuscles: f.get('primaryMuscles'),
          secondaryMuscles: f.get('secondaryMuscles'),
          alternatives: f.get('alternatives'),
          dayId: f.get('dayId') || undefined,
          imgUrl: imgFile ? undefined : imgUrl,
          videoUrl: videoFile ? undefined : videoUrl,
          imgFile: imgFile || undefined,
          videoFile: videoFile || undefined,
        };
        onSubmit?.(payload);
      }}
      className='space-y-4'>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        <Field label='Name'>
          <input name='name' defaultValue={initial?.name || ''} required className='inp' />
        </Field>
        <Field label='Order Index'>
          <input name='orderIndex' type='number' min={0} defaultValue={initial?.orderIndex ?? 0} className='inp' />
        </Field>

        <Field label='Target Reps'>
          <input name='targetReps' defaultValue={initial?.targetReps || '10'} className='inp' />
        </Field>
        <Field label='Target Sets'>
          <input name='targetSets' type='number' min={0} defaultValue={initial?.targetSets ?? 3} className='inp' />
        </Field>

        <Field label='Rest (sec)'>
          <input name='restSeconds' type='number' min={0} defaultValue={initial?.restSeconds ?? 90} className='inp' />
        </Field>
        <Field label='Equipment'>
          <input name='equipment' defaultValue={initial?.equipment || ''} className='inp' placeholder='Machine / Dumbbell / Cable' />
        </Field>

        <Field label='Primary Muscles (comma)'>
          <TagInput name='primaryMuscles' defaultValue={initial?.primaryMuscles || []} placeholder='Back, Lats' />
        </Field>
        <Field label='Secondary Muscles (comma)'>
          <TagInput name='secondaryMuscles' defaultValue={initial?.secondaryMuscles || []} placeholder='Rear Delts, Biceps' />
        </Field>

        <Field label='Alternatives (IDs, comma)'>
          <TagInput name='alternatives' defaultValue={initial?.alternatives || []} placeholder='ex8, ex9' />
        </Field>
        <Field label='Day ID (optional)'>
          <input name='dayId' defaultValue={initial?.day?.id || ''} className='inp' placeholder='UUID of PlanDay' />
        </Field>

        <Field label='Status'>
          <select name='status' defaultValue={initial?.status || 'Active'} className='inp'>
            {['Active', 'Inactive', 'Pending', 'Suspended'].map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field label='Description'>
          <textarea name='desc' defaultValue={initial?.desc || ''} className='inp' rows={3} />
        </Field>

        {/* Media – URL or Upload */}
        <Field label='Image'>
          <div className='flex flex-col gap-2'>
            <div className='flex gap-2'>
              <span className='inline-flex items-center gap-2 text-xs text-slate-600'>
                <LinkIcon className='w-3 h-3' /> URL
              </span>
              <input value={imgUrl} onChange={e => setImgUrl(e.target.value)} placeholder='https://...' className='inp flex-1' />
              <label className='inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white cursor-pointer'>
                <ImageIcon className='w-4 h-4' />
                <span>Upload</span>
                <input type='file' accept='image/*' className='hidden' onChange={e => setImgFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <MediaPreview type='image' url={imgFile ? URL.createObjectURL(imgFile) : imgUrl} />
          </div>
        </Field>

        <Field label='Video'>
          <div className='flex flex-col gap-2'>
            <div className='flex gap-2'>
              <span className='inline-flex items-center gap-2 text-xs text-slate-600'>
                <LinkIcon className='w-3 h-3' /> URL
              </span>
              <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder='https://...' className='inp flex-1' />
              <label className='inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white cursor-pointer'>
                <VideoIcon className='w-4 h-4' />
                <span>Upload</span>
                <input type='file' accept='video/*' className='hidden' onChange={e => setVideoFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <MediaPreview type='video' url={videoFile ? URL.createObjectURL(videoFile) : videoUrl} />
          </div>
        </Field>
      </div>

      <div className='flex items-center justify-end gap-2 pt-2'>
        <button type='submit' className='px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white'>
          Save
        </button>
      </div>

      <style jsx>{`
        .inp {
          @apply mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30;
        }
      `}</style>
    </form>
  );
}

/* --------------------------- Tiny UI helpers --------------------------- */
function Field({ label, children }) {
  return (
    <div>
      <label className='text-sm text-slate-600'>{label}</label>
      {children}
    </div>
  );
}

function TagInput({ name, defaultValue = [], placeholder }) {
  const [value, setValue] = useState('');
  const [tags, setTags] = useState(Array.isArray(defaultValue) ? defaultValue : toArray(defaultValue));

  const add = () => {
    const t = value.trim();
    if (!t) return;
    if (!tags.includes(t)) setTags(prev => [...prev, t]);
    setValue('');
  };
  const remove = t => setTags(prev => prev.filter(x => x !== t));
  const onKey = e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    } else if (e.key === 'Backspace' && !value && tags.length) {
      remove(tags[tags.length - 1]);
    }
  };

  return (
    <div className='mt-1'>
      <div className='flex flex-wrap items-center gap-2 p-2 rounded-xl border border-slate-200 bg-white'>
        {tags.map(t => (
          <span key={t} className='inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-indigo-50 text-indigo-700 border border-indigo-100'>
            {t}
            <button type='button' className='text-indigo-600 hover:text-indigo-800' onClick={() => remove(t)}>
              ×
            </button>
          </span>
        ))}
        <input value={value} onChange={e => setValue(e.target.value)} onKeyDown={onKey} placeholder={tags.length ? '' : placeholder || 'Type and press Enter'} className='flex-1 min-w-[120px] outline-none text-sm' />
      </div>
      {/* Hidden field mirrors array as comma string for form submit */}
      <input type='hidden' name={name} value={tags.join(',')} />
    </div>
  );
}

function MediaPreview({ type, url }) {
  if (!url) return null;
  return <div className='mt-2 rounded-xl overflow-hidden border border-slate-200'>{type === 'video' ? <video src={ baseImg + url} className='w-full h-36 object-contain bg-white' muted controls /> : <img src={ baseImg + url} className='w-full h-36 object-contain bg-white' alt='' />}</div>;
}

function KpiSkeleton() {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full'>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className='card-glow p-4'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl shimmer' />
            <div className='flex-1'>
              <div className='h-3 shimmer w-24 rounded mb-2' />
              <div className='h-4 shimmer w-16 rounded' />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
