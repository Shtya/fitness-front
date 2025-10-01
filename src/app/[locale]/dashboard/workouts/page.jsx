/*
  - Replaced alert/confirm with modal dialogs (ConfirmDialog + InfoDialog via Modal)
  - Preview modal now shows IMAGE first with a toggle to VIDEO
  - Edit form now fully controlled; inputs populate reliably when opening edit
  - Cards show image instead of autoplay video; video playable from preview modal
  - Fixed native input onChange bug in search (was passing value, needed e.target.value)
  - Kept multipart handling; added small UX touches (skeletons, errors)
*/

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Plus, LayoutGrid, Rows, Eye, Pencil, Trash2, Layers, Settings, RefreshCcw, Clock, ChevronUp, ChevronDown, Play, Image as ImageIcon, Video as VideoIcon, Link as LinkIcon, Upload, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';

import api, { baseImg } from '@/utils/axios';
import { Modal, StatCard, PageHeader } from '@/components/dashboard/ui/UI';
import Img from '@/components/atoms/Img';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import { Notification } from '@/config/Notification';
import Select from '@/components/atoms/Select';

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
  if (!hasFile) return null; // send JSON if no files
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (k === 'imgFile' && v) fd.append('img', v);
    else if (k === 'videoFile' && v) fd.append('video', v);
    else fd.append(k, String(v));
  });
  return fd;
};

const resURL = url => {
  if (!url) return '';
  return url.startsWith('/') ? baseImg + url : url;
};

/* --------------------------- Small Dialog Helpers -------------------------- */
function ConfirmDialog({ open, onClose, title = 'Are you sure?', message = '', onConfirm, confirmText = 'Confirm' }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className='space-y-4'>
        {message ? <p className='text-sm text-slate-600'>{message}</p> : null}
        <div className='flex items-center justify-end gap-2'>
          <Button name='Cancel' color='neutral' className='!w-fit' onClick={onClose} />
          <Button
            name={confirmText}
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
}

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
  const [perPage, setPerPage] = useState(12);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [searchText, setSearchText] = useState('');
  const debounced = useDebounced(searchText, 350);

  // ui
  const [view, setView] = useState('grid'); // grid | list
  const [preview, setPreview] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  // delete modal state
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // race guard
  const reqId = useRef(0);

  const fetchList = async () => {
    setErr(null);
    setLoading(true);
    const myId = ++reqId.current;
    try {
      const params = { page, limit: perPage, sortBy, sortOrder };
      if (debounced) params.search = debounced;

      const res = await api.get('/plan-exercises', { params });
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
    } catch {
      // ignore
    } finally {
      setLoadingStats(false);
    }
  };

  // reset to page 1 on search/sort changes
  useEffect(() => {
    setPage(1);
  }, [debounced, sortBy, sortOrder, perPage]);

  useEffect(() => {
    fetchList();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debounced, sortBy, sortOrder, perPage]);

  const toggleSort = field => {
    if (sortBy === field) {
      setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
  };

  /* ----------------------------- CRUD Handlers ---------------------------- */
  const askDelete = id => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/plan-exercises/${deleteId}`);
      setItems(arr => arr.filter(x => x.id !== deleteId));
      setTotal(t => Math.max(0, t - 1));
      Notification('Exercise deleted', 'success');
    } catch (e) {
      Notification(e?.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const createOrUpdate = async ({ id, payload }) => {
    const body = {
      name: payload.name,
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
  };

  /* --------------------------------- UI ---------------------------------- */
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, perPage)));

  return (
    <div className='space-y-6'>
      {/* Header / Stats */}
      <div className='rounded-xl md:rounded-2xl overflow-hidden border border-indigo-200'>
        <div className='relative p-4 md:p-8 bg-gradient text-white'>
          <div className='absolute inset-0 opacity-20 bg-[radial-gradient(600px_200px_at_20%_-20%,white,transparent)]' />
          <div className='relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:gap-6 md:justify-between'>
            <PageHeader title='Exercises' subtitle='Manage your gym’s exercise library.' />
            <div className='flex items-center gap-2'>
              <Button name='Add Exercises' icon={<Plus className='w-4 h-4' />} onClick={() => setBulkOpen(true)} />
              <Button name='Exercise' icon={<Plus className='w-4 h-4' />} onClick={() => setAddOpen(true)} />
            </div>
          </div>

          <div className='grid grid-cols-4 gap-2 flex items-center justify-start gap-3 mt-6'>
            {loadingStats ? (
              <KpiSkeleton />
            ) : (
              <>
                <StatCard className=' ' icon={Layers} title='Total' value={stats?.totals?.total || 0} />
                <StatCard className=' ' icon={Settings} title='With Video' value={stats?.totals?.withVideo || 0} />
                <StatCard className=' ' icon={RefreshCcw} title='With Image' value={stats?.totals?.withImage || 0} />
                <StatCard className=' ' icon={Clock} title='Avg Rest (s)' value={stats?.totals?.avgRest ?? 0} sub={`${stats?.totals?.created7d || 0} added 7d`} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filters + search */}
      <div className='flex items-center gap-2 mt-12 flex-wrap'>
        <div className='flex-1 flex items-center gap-2'>
          <div className='relative w-full md:w-60'>
            <Search className='absolute left-3 z-[10] top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
            {/* FIXED: native input must use e.target.value */}
            <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder='Search name...' className={` h-[40px] w-full pl-10 pr-3 rounded-xl bg-white text-black border border-slate-300 font-medium text-sm shadow-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-indigo-500/40 hover:border-indigo-400 transition `} />
          </div>

          <Button
            name={
              <span className='inline-flex items-center gap-2'>
                {view === 'grid' ? <Rows size={16} /> : <LayoutGrid size={16} />}
                {view === 'grid' ? 'List' : 'Grid'}
              </span>
            }
            color='outline'
            className='!w-fit !h-[40px] !bg-white rounded-xl '
            onClick={() => setView(v => (v === 'grid' ? 'list' : 'grid'))}
          />
        </div>

        <Select
          label=''
          className='!max-w-[150px] !w-full '
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

        <button onClick={() => toggleSort('created_at')} className={` bg-white inline-flex items-center h-[40px] gap-2 px-4 py-2 rounded-xl  text-black border border-slate-300   font-medium text-sm backdrop-blur-md hover:from-indigo-500/90 hover:to-sky-400/90 active:scale-[.97] transition `}>
          <Clock size={16} />
          <span>Newest</span>
          {sortBy === 'created_at' ? sortOrder === 'ASC' ? <ChevronUp className='w-4 h-4 text-black transition-transform' /> : <ChevronDown className='w-4 h-4 text-black transition-transform' /> : null}
        </button>
      </div>

      {/* Errors */}
      {err ? <div className='p-3 rounded-xl bg-red-50 text-red-700 border border-red-100'>{err}</div> : null}

      {/* Content */}
      {view === 'grid' ? <GridView loading={loading} items={items} onView={setPreview} onEdit={setEditRow} onDelete={askDelete} /> : <ListView loading={loading} items={items} onView={setPreview} onEdit={setEditRow} onDelete={askDelete} />}

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {/* Preview (now image-first with toggle) */}
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
              Notification('Exercise created', 'success');
            } catch (e) {
              Notification(e?.response?.data?.message || 'Create failed', 'error');
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
                Notification('Exercise updated', 'success');
              } catch (e) {
                Notification(e?.response?.data?.message || 'Update failed', 'error');
              }
            }}
          />
        )}
      </Modal>

      {/* Bulk */}
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title='Bulk Add Exercises' maxW='max-w-3xl'>
        <BulkAdd
          onCancel={() => setBulkOpen(false)}
          onSubmit={async itemsToSend => {
            try {
              const res = await api.post('/plan-exercises/bulk', { items: itemsToSend });
              const saved = Array.isArray(res.data) ? res.data : [];
              setItems(arr => [...saved, ...arr]);
              setTotal(t => t + saved.length);
              setBulkOpen(false);
              Notification(`Added ${saved.length} exercise(s)`, 'success');
            } catch (e) {
              Notification(e.response?.data?.message?.[0] || e?.response?.data?.message || 'Bulk create failed', 'error');
            }
          }}
        />
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
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
const IconButton = ({ title, onClick, children, danger = false }) => (
  <button title={title} onClick={onClick} className={`w-[34px] h-[34px] inline-flex items-center justify-center rounded-lg border transition ${danger ? 'border-red-200 bg-white text-red-600 hover:bg-red-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
    {children}
  </button>
);

/* ------------------------------ Grid View ------------------------------ */
function GridView({ loading, items, onView, onEdit, onDelete }) {
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
        const hasImg = Boolean(e.img);
        const hasVideo = Boolean(e.video);

        return (
          <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='card-glow overflow-hidden p-0 group'>
            {/* Media (image-first; no in-card video playback) */}
            <div className='relative aspect-video bg-slate-100'>
              {hasImg ? (
                <img src={resURL(e.img)} alt={e.name} className='w-full h-full object-contain bg-white' />
              ) : hasVideo ? (
                <div className='w-full h-full grid place-content-center'>
                  <Play className='w-8 h-8 text-slate-400' />
                </div>
              ) : (
                <div className='w-full h-full grid place-content-center'>
                  <Play className='w-8 h-8 text-slate-300' />
                </div>
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
                Sets {e.targetSets ?? 3} · Reps {e.targetReps || '—'} · Rest {e.rest ?? 90}s{e.tempo ? ` · Tempo ${e.tempo}` : ''}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ------------------------------ List View ------------------------------ */
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
      {items.map(e => {
        const hasImg = Boolean(e.img);
        return (
          <div key={e.id} className='p-4 flex items-center justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <div className='w-16 h-10 rounded-lg bg-slate-100 grid place-content-center overflow-hidden'>{hasImg ? <img src={resURL(e.img)} alt={e.name} className='w-full h-full object-contain bg-white' /> : <Play className='w-5 h-5 text-slate-400' />}</div>
              <div>
                <div className='font-medium'>{e.name}</div>
                <div className='text-xs text-slate-500'>
                  Sets {e.targetSets ?? 3} · Reps {e.targetReps || '—'} · Rest {e.rest ?? 90}s{e.tempo ? ` · Tempo ${e.tempo}` : ''}
                </div>
              </div>
            </div>
            <div className='flex items-center gap-2'>
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
        );
      })}
    </div>
  );
}

/* ---------------------------- Preview Modal ---------------------------- */
/** Image-first with toggle buttons to switch between Image / Video */
function ExercisePreview({ exercise }) {
  const hasImg = !!exercise.img;
  const hasVideo = !!exercise.video;
  const [tab, setTab] = useState(hasImg ? 'image' : 'video');

  useEffect(() => {
    // when exercise changes, reset tab to image if available
    setTab(hasImg ? 'image' : 'video');
  }, [exercise.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className='space-y-4'>
      {(hasImg || hasVideo) && (
        <div className='flex items-center gap-2'>
          <button className={`px-3 py-1.5 text-sm rounded-lg border ${tab === 'image' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`} onClick={() => setTab('image')} disabled={!hasImg} title={hasImg ? 'Show image' : 'No image available'}>
            <span className='inline-flex items-center gap-1'>
              <ImageIcon size={14} /> Image
            </span>
          </button>
          <button className={`px-3 py-1.5 text-sm rounded-lg border ${tab === 'video' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`} onClick={() => setTab('video')} disabled={!hasVideo} title={hasVideo ? 'Show video' : 'No video available'}>
            <span className='inline-flex items-center gap-1'>
              <VideoIcon size={14} /> Video
            </span>
          </button>
        </div>
      )}

      <div className=' bg-white w-full max-h-[500px] rounded-xl overflow-hidden  grid place-content-center'>{
			tab === 'image' && hasImg 
			? <Img src={exercise.img} alt={exercise.name} className='aspect-square w-full h-full object-contain bg-white' /> 
			: tab === 'video' && hasVideo 
				? <video src={resURL(exercise.video)} controls className=' aspect-square w-full h-full object-contain bg-white' /> 
				: <div className='text-slate-400 text-sm'>No media</div>
				}
				</div>

      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='text-lg font-semibold'>{exercise.name}</div>
          <div className='text-sm text-slate-600'>
            Sets {exercise.targetSets ?? 3} · Reps {exercise.targetReps || '—'} · Rest {exercise.rest ?? 90}s{exercise.tempo ? ` · Tempo ${exercise.tempo}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------- Form (Create / Edit) -------------------------- */
/** Fully controlled so fields populate when opening edit */
function ExerciseForm({ initial, onSubmit }) {
  const [name, setName] = useState(initial?.name || '');
  const [targetReps, setTargetReps] = useState(initial?.targetReps || '10');
  const [targetSets, setTargetSets] = useState(initial?.targetSets ?? 3);
  const [rest, setRest] = useState(initial?.rest ?? 90);
  const [tempo, setTempo] = useState(initial?.tempo || '');

  const [imgUrl, setImgUrl] = useState(initial?.img || '');
  const [videoUrl, setVideoUrl] = useState(initial?.video || '');
  const [imgFile, setImgFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);

  useEffect(() => {
    setName(initial?.name || '');
    setTargetReps(initial?.targetReps || '10');
    setTargetSets(initial?.targetSets ?? 3);
    setRest(initial?.rest ?? 90);
    setTempo(initial?.tempo || '');
    setImgUrl(initial?.img || '');
    setVideoUrl(initial?.video || '');
    setImgFile(null);
    setVideoFile(null);
  }, [initial]);

  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        const payload = {
          name,
          targetReps: targetReps || '10',
          targetSets: targetSets || 3,
          rest: rest || 90,
          tempo: tempo || '',
          imgUrl: imgFile ? undefined : imgUrl,
          videoUrl: videoFile ? undefined : videoUrl,
          imgFile: imgFile || undefined,
          videoFile: videoFile || undefined,
        };
        onSubmit?.(payload);
      }}
      className='space-y-4'>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        <Input label='Name' name='name' value={name} onChange={v => setName(v)} required />
        <Input label='Target Reps' name='targetReps' value={targetReps} onChange={v => setTargetReps(v)} />

        <Input label='Target Sets' name='targetSets' type='number' min={0} value={String(targetSets)} onChange={v => setTargetSets(Number(v || 0))} />
        <Input label='Rest (sec)' name='rest' type='number' min={0} value={String(rest)} onChange={v => setRest(Number(v || 0))} />

        <Input label='Tempo' name='tempo' placeholder='1/1/1' value={tempo} onChange={v => setTempo(v)} />

        {/* Media – URL or Upload */}
        <div className='col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <div>
            <label className='text-sm text-slate-600'>Image</label>
            <div className='flex flex-col gap-2'>
              <div className='flex gap-2 items-center'>
                <span className='inline-flex items-center gap-2 text-xs text-slate-600'>
                  <LinkIcon className='w-3 h-3' /> URL
                </span>
                <Input label='' name='imgUrl' value={imgUrl} onChange={val => setImgUrl(val)} placeholder='https://… or /uploads/…' className='flex-1' />
                <label className='inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white cursor-pointer text-sm'>
                  <ImageIcon className='w-4 h-4' />
                  <span>Upload</span>
                  <input type='file' accept='image/*' className='hidden' onChange={e => setImgFile(e.target.files?.[0] || null)} />
                </label>
              </div>
              <MediaPreview type='image' url={imgFile ? URL.createObjectURL(imgFile) : imgUrl} />
            </div>
          </div>

          <div>
            <label className='text-sm text-slate-600'>Video</label>
            <div className='flex flex-col gap-2'>
              <div className='flex gap-2 items-center'>
                <span className='inline-flex items-center gap-2 text-xs text-slate-600'>
                  <LinkIcon className='w-3 h-3' /> URL
                </span>
                <Input label='' name='videoUrl' value={videoUrl} onChange={val => setVideoUrl(val)} placeholder='https://… or /uploads/…' className='flex-1' />
                <label className='inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white cursor-pointer text-sm'>
                  <VideoIcon className='w-4 h-4' />
                  <span>Upload</span>
                  <input type='file' accept='video/*' className='hidden' onChange={e => setVideoFile(e.target.files?.[0] || null)} />
                </label>
              </div>
              <MediaPreview type='video' url={videoFile ? URL.createObjectURL(videoFile) : videoUrl} />
            </div>
          </div>
        </div>
      </div>

      <div className='flex items-center justify-end gap-2 pt-2'>
        <Button name='Save' />
      </div>
    </form>
  );
}

/* ------------------------------ Bulk Add UI ------------------------------ */
function BulkAdd({ onSubmit }) {
  const [text, setText] = useState(`[
  {
    "name": "Machine Flat Chest Press",
    "targetSets": 3,
    "targetReps": "8",
    "rest": 90,
    "tempo": "1/1/1",
    "img": "/uploads/20/container/img-1.png",
    "video": "/uploads/20/container/vid-1.mp4"
  }
]`);
  const [fileErr, setFileErr] = useState('');
  const [items, setItems] = useState([]);

  const parseCSV = csv => {
    // Simple CSV helper (expects headers)
    const lines = csv.trim().split(/\r?\n/);
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(s => s.trim());
    const idx = key => headers.indexOf(key);
    const out = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(s => s.trim());
      const item = {
        name: cols[idx('name')],
        targetSets: Number(cols[idx('targetSets')] ?? 3),
        targetReps: String(cols[idx('targetReps')] ?? '10'),
        rest: Number(cols[idx('rest')] ?? 90),
        tempo: cols[idx('tempo')] || null,
        img: cols[idx('img')] || null,
        video: cols[idx('video')] || null,
      };
      if (item.name) out.push(item);
    }
    return out;
  };

  const handlePreview = () => {
    setFileErr('');
    try {
      let parsed = [];
      const trimmed = text.trim();
      if (!trimmed) {
        setItems([]);
        return;
      }
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        // JSON
        const raw = JSON.parse(trimmed);
        const arr = Array.isArray(raw) ? raw : [raw];
        parsed = arr
          .map(i => ({
            name: i.name,
            targetSets: Number(i.targetSets ?? 3),
            targetReps: String(i.targetReps ?? '10'),
            rest: Number(i.rest ?? 90),
            tempo: i.tempo ?? null,
            img: i.img ?? null,
            video: i.video ?? null,
          }))
          .filter(i => i.name);
      } else {
        // CSV
        parsed = parseCSV(trimmed);
      }
      setItems(parsed);
    } catch (e) {
      setFileErr(e.message || 'Failed to parse input');
      setItems([]);
    }
  };

  const handleFile = f => {
    setFileErr('');
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ''));
    reader.onerror = () => setFileErr('Failed to read file');
    reader.readAsText(f);
  };

  return (
    <div className='space-y-4  '>
      <div className='flex items-center justify-between gap-2'>
        <div className='text-sm text-slate-600'>
          Paste <b>JSON</b> array or a <b>CSV</b> with headers:
        </div>
        <label className='inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white cursor-pointer text-sm'>
          <Upload className='w-4 h-4' />
          <span className='text-nowrap'>Import file</span>
          <input type='file' accept='.json,.csv,.txt' className='hidden' onChange={e => handleFile(e.target.files?.[0] || null)} />
        </label>
      </div>

      <textarea value={text} onChange={e => setText(e.target.value)} rows={10} className=' bg-white w-full rounded-xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-indigo-500/30' />

      <div className='flex items-center gap-2'>
        <Button name='Preview' className='!w-fit hover:!bg-gray-50' color='neutral' onClick={handlePreview} />
        <div className='text-xs text-slate-500 ml-auto'>{items.length ? `${items.length} item(s) ready` : ''}</div>
      </div>

      {fileErr ? <div className='p-2 rounded bg-red-50 text-red-600 text-sm border border-red-100'>{fileErr}</div> : null}

      {!!items.length && (
        <>
          <div className='overflow-auto border border-slate-200 rounded-xl'>
            <table className='min-w-full text-sm'>
              <thead className='bg-slate-50'>
                <tr>
                  {['name', 'target Sets', 'target Reps', 'rest', 'tempo', 'img', 'video'].map(h => (
                    <th key={h} className='text-left px-3 py-2 font-semibold text-slate-700 capitalize '>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='bg-slate-100 '>
                {items.map((it, i) => (
                  <tr key={i} className='border-t border-t-slate-100 '>
                    <td className='px-3 py-2'>{it.name}</td>
                    <td className='px-3 py-2'>{it.targetSets}</td>
                    <td className='px-3 py-2'>{it.targetReps}</td>
                    <td className='px-3 py-2'>{it.rest}</td>
                    <td className='px-3 py-2'>{it.tempo || '—'}</td>
                    <td className='px-3 py-2 truncate max-w-[80px]' title={it.img || ''}>
                      {it.img || '—'}
                    </td>
                    <td className='px-3 py-2 truncate max-w-[80px]' title={it.video || ''}>
                      {it.video || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className='flex items-center justify-end gap-2'>
            <Button name='Submit' icon={<Plus size={20} />} className='!w-fit  !ml-auto' onClick={() => onSubmit(items)} />
          </div>
        </>
      )}
    </div>
  );
}

/* --------------------------- Tiny UI helpers --------------------------- */
function MediaPreview({ type, url }) {
  if (!url) return null;
  const src = resURL(url);
  return <div className='mt-2 rounded-xl overflow-hidden border border-slate-200'>{type === 'video' ? <video src={src} className='w-full h-36 object-contain bg-white' muted controls /> : <Img src={src} className='w-full h-36 object-contain bg-white' alt='' />}</div>;
}

function KpiSkeleton() {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full  col-span-4'>
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

/* ---------------------------- Pagination UI ---------------------------- */
function Pagination({ page, totalPages, onChange }) {
  const maxButtons = 7;
  const pages = useMemo(() => {
    const arr = [];
    const start = Math.max(1, page - Math.floor(maxButtons / 2));
    const end = Math.min(totalPages, start + maxButtons - 1);
    for (let i = Math.max(1, end - maxButtons + 1); i <= end; i++) arr.push(i);
    return arr;
  }, [page, totalPages]);

  const go = p => onChange(Math.max(1, Math.min(totalPages, p)));

  if (totalPages <= 1) return null;
  return (
    <div className='flex items-center justify-center gap-2 pt-2'>
      <Button icon={<ChevronLeft />} className=' bg-gradient !w-[40px] !h-[40px]' onClick={() => go(page - 1)} disabled={page <= 1} />
      {pages.map(p => (
        <button key={p} onClick={() => go(p)} className={`w-[40px] h-[40px] flex items-center justify-center rounded-xl border ${p === page ? 'bg-gradient text-white ' : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50'}`}>
          {p}
        </button>
      ))}
      <Button icon={<ChevronRight />} className='bg-gradient !w-[40px] !h-[40px]' onClick={() => go(page + 1)} disabled={page >= totalPages} />
    </div>
  );
}
