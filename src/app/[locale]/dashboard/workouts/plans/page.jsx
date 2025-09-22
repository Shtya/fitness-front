'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Plus, Search as SearchIcon, LayoutGrid, Rows, Eye, Pencil, Trash2, CheckCircle2, Settings, RefreshCcw, Clock, ChevronUp, ChevronDown, Users as UsersIcon, Calendar as CalendarIcon, ChevronRight, X as XIcon, Layers } from 'lucide-react';

import api from '@/utils/axios';
import { Modal, StatCard, PageHeader } from '@/components/dashboard/ui/UI';
import { Badge } from '@/components/site/UI';

const spring = { type: 'spring', stiffness: 360, damping: 30, mass: 0.7 };

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

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/* --------------------------------- Page --------------------------------- */
export default function PlansPage() {
  // list
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // paging/sort/search
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [searchText, setSearchText] = useState('');
  const debounced = useDebounced(searchText, 350);

  // ui
  const [view, setView] = useState('grid'); // grid | list
  const [preview, setPreview] = useState(null); // plan (with days)
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState(null); // plan (with days)
  const [assignOpen, setAssignOpen] = useState(null); // plan to assign

  // race guard
  const reqId = useRef(0);

  const fetchList = async ({ reset = false } = {}) => {
    setErr(null);
    if (reset) setLoading(true);
    const myId = ++reqId.current;
    try {
      const params = { page, limit, sortBy, sortOrder };
      if (debounced) params.search = debounced;

      const res = await api.get('/plans', { params });
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
      setErr(e?.response?.data?.message || 'Failed to load plans');
    } finally {
      if (myId === reqId.current) setLoading(false);
    }
  };

  // reset when search/sort changes
  useEffect(() => {
    setItems([]);
    setPage(1);
  }, [debounced, sortBy, sortOrder]);

  useEffect(() => {
    fetchList({ reset: page === 1 });
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

  // derived stats (lightweight; based on currently loaded items)
  const kpiTotal = total || items.length;
  const kpiActive = items.filter(p => p.isActive).length;
  const kpiDays = items.reduce((acc, p) => acc + (p.days?.length || 0), 0);
  const kpiAvgDays = items.length ? Math.round(kpiDays / items.length) : 0;

  /* ------------------------------ CRUD actions ------------------------------ */
  const getOne = async id => {
    const res = await api.get(`/plans/${id}`);
    return res.data;
  };

  const handleDelete = async id => {
    if (!confirm('Delete this plan?')) return;
    try {
      await api.delete(`/plans/${id}`);
      setItems(arr => arr.filter(x => x.id !== id));
      setTotal(t => Math.max(0, t - 1));
    } catch (e) {
      alert(e?.response?.data?.message || 'Delete failed');
    }
  };

  const createOrUpdate = async ({ id, payload }) => {
    // backend expects name, isActive, notes, startDate, endDate, coachId, program.days[]
    const url = id ? `/plans/${id}` : '/plans';
    const method = id ? 'put' : 'post';
    const res = await api[method](url, payload, { headers: { 'Content-Type': 'application/json' } });
    return res.data;
  };

  const openPreview = async plan => {
    try {
      const full = await getOne(plan.id);
      setPreview(full);
    } catch {
      setPreview(plan);
    }
  };

  const openEdit = async plan => {
    try {
      const full = await getOne(plan.id);
      setEditRow(full);
    } catch {
      setEditRow(plan);
    }
  };

  const openAssign = plan => setAssignOpen(plan);

  /* --------------------------------- UI ---------------------------------- */
  return (
    <div className='space-y-6'>
      {/* Header / Stats */}
      <div className='rounded-xl md:rounded-2xl overflow-hidden border border-indigo-200'>
        <div className='relative p-4 md:p-8 bg-gradient text-white'>
          <div className='absolute inset-0 opacity-20 bg-[radial-gradient(600px_200px_at_20%_-20%,white,transparent)]' />
          <div className='relative z-10 flex flex-row md:items-center gap-3 md:gap-6 justify-between'>
            <PageHeader icon={Dumbbell} title='Plans' subtitle='Create programs, organize days, and assign to athletes.' />
            <button onClick={() => setAddOpen(true)} className='cursor-pointer hover:scale-[.95] duration-300 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white'>
              <Plus className='w-4 h-4' /> New Plan
            </button>
          </div>

          <div className='flex items-center justify-start gap-3 mt-6'>
            {loading && page === 1 ? (
              <KpiSkeleton />
            ) : (
              <>
                <StatCard className='max-w-[220px] w-full' icon={Layers} title='Total Plans' value={kpiTotal} />
                <StatCard className='max-w-[220px] w-full' icon={CheckCircle2} title='Active (page)' value={kpiActive} />
                <StatCard className='max-w-[220px] w-full' icon={Settings} title='Avg. Days (page)' value={kpiAvgDays} />
                <StatCard className='max-w-[220px] w-full' icon={RefreshCcw} title='Loading' value={loading ? '…' : 'Idle'} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Controls: Search + Sort + View (no extra filters) */}
      <div className='flex items-center gap-2 mt-12 flex-wrap'>
        <div className='relative w-full md:w-72'>
          <SearchIcon className='absolute left-3 z-[10] top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
          <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder='Search plan name or notes…' className='h-[40px] w-full pl-10 pr-3 rounded-xl bg-white text-black border border-slate-300 font-medium text-sm shadow-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-indigo-500/40 hover:border-indigo-400 transition' />
        </div>

        <button
          onClick={() => {
            if (sortBy === 'name') setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
            else {
              setSortBy('name');
              setSortOrder('ASC');
            }
          }}
          className='bg-white inline-flex items-center h-[40px] gap-2 px-4 py-2 rounded-xl text-black border border-slate-300 font-medium text-sm backdrop-blur-md active:scale-[.97] transition'>
          <span>Name</span>
          {sortBy === 'name' ? sortOrder === 'ASC' ? <ChevronUp className='w-4 h-4 text-black' /> : <ChevronDown className='w-4 h-4 text-black' /> : null}
        </button>

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
      {view === 'grid' ? <GridView loading={loading && page === 1} items={items} onPreview={openPreview} onEdit={openEdit} onDelete={handleDelete} onAssign={openAssign} /> : <ListView loading={loading && page === 1} items={items} onPreview={openPreview} onEdit={openEdit} onDelete={handleDelete} onAssign={openAssign} />}

      {/* Load more */}
      <div className='flex justify-center py-2'>{loading && page > 1 ? <ButtonGhost disabled>Loading…</ButtonGhost> : items.length < total ? <ButtonGhost onClick={() => setPage(p => p + 1)}>Load more</ButtonGhost> : null}</div>

      {/* Preview */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || 'Plan'} maxW='max-w-4xl'>
        {preview && <PlanPreview plan={preview} />}
      </Modal>

      {/* Add */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title='Create Plan' maxW='max-w-3xl'>
        <PlanForm
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
      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Edit: ${editRow?.name || ''}`} maxW='max-w-3xl'>
        {editRow && (
          <PlanForm
            initial={editRow}
            onSubmit={async payload => {
              try {
                const saved = await createOrUpdate({ id: editRow.id, payload });
                setItems(arr => arr.map(p => (p.id === editRow.id ? saved : p)));
                setEditRow(null);
              } catch (e) {
                alert(e?.response?.data?.message || 'Update failed');
              }
            }}
          />
        )}
      </Modal>

      {/* Assign */}
      <Modal open={!!assignOpen} onClose={() => setAssignOpen(null)} title={`Assign: ${assignOpen?.name || ''}`} maxW='max-w-xl'>
        {assignOpen && (
          <AssignForm
            planId={assignOpen.id}
            onClose={() => setAssignOpen(null)}
            onAssigned={() => {
              setAssignOpen(null);
            }}
          />
        )}
      </Modal>

      {/* shimmer css */}
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

/* -------------------------------- Grid View -------------------------------- */
function GridView({ loading, items, onPreview, onEdit, onDelete, onAssign }) {
  if (loading) {
    return (
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3'>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className='card-glow p-4'>
            <div className='h-36 rounded-xl shimmer mb-3' />
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
        <h3 className='mt-4 text-lg font-semibold'>No plans found</h3>
        <p className='text-sm text-slate-600 mt-1'>Try a different search query or create a new plan.</p>
      </div>
    );
  }
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3'>
      {items.map(p => (
        <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='card-glow p-4 group relative'>
          {/* floating actions */}
          <div className='absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition'>
            <IconMini title='Preview' onClick={() => onPreview(p)}>
              <Eye className='w-4 h-4' />
            </IconMini>
            <IconMini title='Edit' onClick={() => onEdit(p)}>
              <Pencil className='w-4 h-4' />
            </IconMini>
            <IconMini title='Delete' onClick={() => onDelete(p.id)} danger>
              <Trash2 className='w-4 h-4' />
            </IconMini>
          </div>

          <div className='flex items-start gap-3'>
            <div className='h-10 w-10 grid place-content-center rounded-xl bg-main/90 text-white shadow'>
              <Dumbbell className='w-5 h-5' />
            </div>
            <div className='flex-1'>
              <div className='font-semibold'>{p.name}</div>
              <div className='text-xs text-slate-500 flex items-center gap-2'>
                <CalendarIcon className='w-3.5 h-3.5' />
                <span>{p.startDate || '—'}</span>
                <ChevronRight className='w-3.5 h-3.5 text-slate-400' />
                <span>{p.endDate || '—'}</span>
              </div>
              {p.notes ? <div className='text-xs text-slate-600 mt-1 line-clamp-2'>{p.notes}</div> : null}

              <div className='flex items-center gap-2 mt-2'>
                <Badge color={p.isActive ? 'green' : 'slate'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                <Badge color='blue'>{(p.days?.length || 0) + ' day' + ((p.days?.length || 0) === 1 ? '' : 's')}</Badge>
              </div>
            </div>
          </div>

          <div className='flex items-center gap-2 mt-3'>
            <button onClick={() => onAssign(p)} className='px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-2'>
              <UsersIcon className='w-4 h-4' />
              Assign
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* -------------------------------- List View -------------------------------- */
function ListView({ loading, items, onPreview, onEdit, onDelete, onAssign }) {
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
  if (!items.length) return <div className='card-glow p-6 text-slate-500'>No plans.</div>;
  return (
    <div className='card-glow divide-y divide-slate-100'>
      {items.map(p => (
        <div key={p.id} className='p-4 flex items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-main/90 text-white grid place-content-center'>
              <Dumbbell className='w-5 h-5' />
            </div>
            <div>
              <div className='font-medium'>{p.name}</div>
              <div className='text-xs text-slate-500'>
                {p.isActive ? 'Active' : 'Inactive'} · {p.days?.length || 0} day(s)
              </div>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <button onClick={() => onAssign(p)} className='px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1.5'>
              <UsersIcon className='w-4 h-4' /> Assign
            </button>
            <IconButton title='Preview' onClick={() => onPreview(p)}>
              <Eye className='w-4 h-4' />
            </IconButton>
            <IconButton title='Edit' onClick={() => onEdit(p)}>
              <Pencil className='w-4 h-4' />
            </IconButton>
            <IconButton title='Delete' onClick={() => onDelete(p.id)} danger>
              <Trash2 className='w-4 h-4' />
            </IconButton>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- Preview ------------------------------- */
function PlanPreview({ plan }) {
  // fetch assignees on demand (optional)
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
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <Badge color={plan.isActive ? 'green' : 'slate'}>{plan.isActive ? 'Active' : 'Inactive'}</Badge>
        {plan.startDate || plan.endDate ? (
          <Badge color='blue'>
            {plan.startDate || '—'} <ChevronRight className='w-3 h-3' /> {plan.endDate || '—'}
          </Badge>
        ) : null}
      </div>

      {plan.notes ? <div className='text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200'>{plan.notes}</div> : null}

      <div className='space-y-3'>
        {(plan.days || []).map((d, idx) => (
          <div key={d.id || idx} className='rounded-xl border border-slate-200 p-3 bg-white'>
            <div className='flex items-center justify-between'>
              <div className='font-medium'>{d.name}</div>
              <div className='text-xs text-slate-500'>{d.day}</div>
            </div>
            <div className='mt-2 text-sm text-slate-600'>
              {(d.exercises || []).length ? (
                <ul className='list-disc pl-5 space-y-1'>
                  {d.exercises.map((ex, i) => (
                    <li key={ex.id || ex.exerciseId || i} className='flex items-center justify-between'>
                      <span>{ex.name || ex.exercise?.name || `Exercise #${i + 1}`}</span>
                      {ex.targetReps || ex.targetSets || ex.restSeconds ? (
                        <span className='text-xs text-slate-500'>
                          {ex.targetSets ? `Sets ${ex.targetSets}` : ''} {ex.targetReps ? `· Reps ${ex.targetReps}` : ''} {ex.restSeconds ? `· Rest ${ex.restSeconds}s` : ''}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className='text-xs text-slate-400'>No exercises yet</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className='pt-2'>
        <div className='text-xs font-semibold text-slate-500 mb-1'>Assignees</div>
        {assignees === null ? (
          <div className='h-8 rounded shimmer w-1/2' />
        ) : assignees.length ? (
          <div className='flex flex-wrap gap-1'>
            {assignees.map(a => (
              <Badge key={a.id} color='indigo'>
                {a.name || a.email || a.id}
              </Badge>
            ))}
          </div>
        ) : (
          <div className='text-xs text-slate-400'>No assignees</div>
        )}
      </div>

      <div className='text-[11px] text-slate-500'>
        Created: {plan.created_at ? new Date(plan.created_at).toLocaleString() : '—'} · Updated: {plan.updated_at ? new Date(plan.updated_at).toLocaleString() : '—'}
      </div>
    </div>
  );
}

/* ----------------------------- Create / Edit ----------------------------- */
function PlanForm({ initial, onSubmit }) {
  // local state for days builder
  const [name, setName] = useState(initial?.name || '');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [isActive, setIsActive] = useState(!!(initial?.isActive ?? true));
  const [coachId, setCoachId] = useState(initial?.coach?.id || '');
  const [startDate, setStartDate] = useState(initial?.startDate || '');
  const [endDate, setEndDate] = useState(initial?.endDate || '');
  const [days, setDays] = useState(
    (initial?.days || []).map(d => ({
      id: d.id,
      name: d.name || '',
      dayOfWeek: d.day || 'monday',
      orderIndex: d.orderIndex || 0,
      exercises: (d.exercises || []).map(ex => ({
        exerciseId: ex.exerciseId || ex.id || ex.exercise?.id || '',
        name: ex.name || ex.exercise?.name || '',
        targetReps: ex.targetReps || '',
        targetSets: ex.targetSets || null,
        restSeconds: ex.restSeconds || null,
      })),
    })),
  );

  const addDay = () => setDays(arr => [...arr, { name: 'New Day', dayOfWeek: 'monday', orderIndex: arr.length, exercises: [] }]);

  const removeDay = idx => setDays(arr => arr.filter((_, i) => i !== idx));

  const updateDay = (idx, patch) => setDays(arr => arr.map((d, i) => (i === idx ? { ...d, ...patch } : d)));

  const addEx = idx =>
    setDays(arr =>
      arr.map((d, i) =>
        i === idx
          ? {
              ...d,
              exercises: [...d.exercises, { exerciseId: '', name: '', targetReps: '', targetSets: null, restSeconds: null }],
            }
          : d,
      ),
    );

  const removeEx = (idx, exIdx) => setDays(arr => arr.map((d, i) => (i === idx ? { ...d, exercises: d.exercises.filter((_, j) => j !== exIdx) } : d)));

  const updateEx = (idx, exIdx, patch) =>
    setDays(arr =>
      arr.map((d, i) =>
        i === idx
          ? {
              ...d,
              exercises: d.exercises.map((ex, j) => (j === exIdx ? { ...ex, ...patch } : ex)),
            }
          : d,
      ),
    );

  // (optional) tiny search to pick an exercise id
  const searchExercise = async (q, setter) => {
    try {
      const res = await api.get('/plan-exercises', { params: { page: 1, limit: 8, search: q } });
      const recs = Array.isArray(res.data?.records) ? res.data.records : Array.isArray(res.data) ? res.data : [];
      setter(recs);
    } catch {
      setter([]);
    }
  };

  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        const payload = {
          name,
          notes,
          isActive,
          coachId: coachId || undefined,
          startDate: startDate || null,
          endDate: endDate || null,
          program: {
            days: days.map((d, dayIndex) => ({
              dayOfWeek: d.dayOfWeek,
              name: d.name || `${d.dayOfWeek} #${dayIndex + 1}`,
              orderIndex: dayIndex,
              exercises: d.exercises.map((ex, i) =>
                ex.exerciseId
                  ? { order: i + 1, exerciseId: ex.exerciseId, targetReps: ex.targetReps || undefined, targetSets: ex.targetSets || undefined, restSeconds: ex.restSeconds || undefined }
                  : {
                      order: i + 1,
                      name: ex.name || `Exercise #${i + 1}`,
                      targetReps: ex.targetReps || '10',
                      targetSets: ex.targetSets || 3,
                      restSeconds: ex.restSeconds || 90,
                    },
              ),
            })),
            meals: [],
            instructions: [],
          },
        };
        onSubmit?.(payload);
      }}
      className='space-y-4'>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        <Field label='Name'>
          <input value={name} onChange={e => setName(e.target.value)} required className='inp' />
        </Field>
        <Field label='Coach ID (optional)'>
          <input value={coachId} onChange={e => setCoachId(e.target.value)} className='inp' placeholder='UUID' />
        </Field>
        <Field label='Start Date'>
          <input type='date' value={startDate || ''} onChange={e => setStartDate(e.target.value)} className='inp' />
        </Field>
        <Field label='End Date'>
          <input type='date' value={endDate || ''} onChange={e => setEndDate(e.target.value)} className='inp' />
        </Field>
        <Field label='Active'>
          <div className='h-[40px] flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3'>
            <input id='active' type='checkbox' checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            <label htmlFor='active' className='text-sm text-slate-700'>
              Is Active
            </label>
          </div>
        </Field>
        <Field label='Notes'>
          <input value={notes} onChange={e => setNotes(e.target.value)} className='inp' placeholder='Optional notes…' />
        </Field>
      </div>

      {/* Days builder */}
      <div className='rounded-xl border border-slate-200 p-3'>
        <div className='flex items-center justify-between mb-2'>
          <div className='text-sm font-semibold'>Days</div>
          <button type='button' onClick={addDay} className='px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1.5'>
            <Plus className='w-4 h-4' /> Add Day
          </button>
        </div>

        {!days.length ? (
          <div className='text-xs text-slate-500'>No days yet.</div>
        ) : (
          <div className='space-y-3'>
            {days.map((d, idx) => (
              <div key={idx} className='rounded-lg border border-slate-200 p-3 bg-white'>
                <div className='flex items-center gap-2'>
                  <input value={d.name} onChange={e => updateDay(idx, { name: e.target.value })} className='inp flex-1' placeholder='Day name e.g. Push A' />
                  <select value={d.dayOfWeek} onChange={e => updateDay(idx, { dayOfWeek: e.target.value })} className='inp w-[150px]'>
                    {DAYS.map(day => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                  <button type='button' onClick={() => removeDay(idx)} className='w-9 h-9 grid place-content-center rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600' title='Remove day'>
                    <XIcon className='w-4 h-4' />
                  </button>
                </div>

                {/* Exercises */}
                <div className='mt-3'>
                  <div className='flex items-center justify-between'>
                    <div className='text-xs font-semibold text-slate-600'>Exercises</div>
                    <button type='button' onClick={() => addEx(idx)} className='text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1.5'>
                      <Plus className='w-3.5 h-3.5' /> Add Exercise
                    </button>
                  </div>

                  <div className='mt-2 space-y-2'>
                    {d.exercises.map((ex, exIdx) => (
                      <ExercisePickerRow key={exIdx} ex={ex} onChange={patch => updateEx(idx, exIdx, patch)} onRemove={() => removeEx(idx, exIdx)} searchExercise={searchExercise} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='flex items-center justify-end gap-2 pt-2'>
        <button type='submit' className='px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white'>
          Save
        </button>
      </div>

      <style jsx>{`
        .inp {
          @apply h-[40px] mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30;
        }
      `}</style>
    </form>
  );
}

function ExercisePickerRow({ ex, onChange, onRemove, searchExercise }) {
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState([]);

  useEffect(() => {
    if (!q || q.length < 2) {
      setOpts([]);
      return;
    }
    let mount = true;
    (async () => {
      await searchExercise(q, recs => {
        if (mount) setOpts(recs);
      });
    })();
    return () => {
      mount = false;
    };
  }, [q, searchExercise]);

  return (
    <div className='rounded-lg border border-slate-200 p-2'>
      <div className='grid grid-cols-1 md:grid-cols-12 gap-2'>
        <div className='md:col-span-4'>
          <input value={ex.exerciseId} onChange={e => onChange({ exerciseId: e.target.value })} className='inp' placeholder='Exercise ID (paste)' />
          <div className='relative mt-2'>
            <input value={q} onChange={e => setQ(e.target.value)} className='inp' placeholder='Search exercises…' />
            {opts.length ? (
              <div className='absolute z-10 w-full mt-1 rounded-lg border border-slate-200 bg-white shadow'>
                {opts.map(o => (
                  <button
                    key={o.id}
                    type='button'
                    onClick={() => {
                      onChange({ exerciseId: o.id, name: o.name, targetReps: o.targetReps || ex.targetReps });
                      setQ('');
                      setOpts([]);
                    }}
                    className='w-full text-left px-3 py-2 text-sm hover:bg-slate-50'>
                    {o.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className='md:col-span-3'>
          <input value={ex.name || ''} onChange={e => onChange({ name: e.target.value })} className='inp' placeholder='Name (optional if ID set)' />
        </div>

        <div className='md:col-span-2'>
          <input value={ex.targetReps || ''} onChange={e => onChange({ targetReps: e.target.value })} className='inp' placeholder='Reps e.g. 8-10' />
        </div>

        <div className='md:col-span-2'>
          <input type='number' min={0} value={ex.targetSets ?? ''} onChange={e => onChange({ targetSets: e.target.value ? Number(e.target.value) : null })} className='inp' placeholder='Sets' />
        </div>

        <div className='md:col-span-1'>
          <input type='number' min={0} value={ex.restSeconds ?? ''} onChange={e => onChange({ restSeconds: e.target.value ? Number(e.target.value) : null })} className='inp' placeholder='Rest' />
        </div>

        <div className='md:col-span-12 flex justify-end'>
          <button type='button' onClick={onRemove} className='px-2.5 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 inline-flex items-center gap-1.5'>
            <XIcon className='w-4 h-4' /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Assign --------------------------------- */
function AssignForm({ planId, onClose, onAssigned }) {
  const [ids, setIds] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        setSubmitting(true);
        try {
          const athleteIds = toArray(ids);
          await api.post(`/plans/${planId}/assign`, {
            athleteIds,
            startDate: startDate || null,
            endDate: endDate || null,
            isActive: active,
          });
          onAssigned?.();
        } catch (err) {
          alert(err?.response?.data?.message || 'Assign failed');
        } finally {
          setSubmitting(false);
        }
      }}
      className='space-y-3'>
      <Field label='Athlete IDs (comma separated)'>
        <input value={ids} onChange={e => setIds(e.target.value)} className='inp' placeholder='uuid-1, uuid-2, uuid-3' />
      </Field>

      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
        <Field label='Start Date'>
          <input type='date' value={startDate || ''} onChange={e => setStartDate(e.target.value)} className='inp' />
        </Field>
        <Field label='End Date'>
          <input type='date' value={endDate || ''} onChange={e => setEndDate(e.target.value)} className='inp' />
        </Field>
        <Field label='Active'>
          <div className='h-[40px] flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3'>
            <input id='a' type='checkbox' checked={active} onChange={e => setActive(e.target.checked)} />
            <label htmlFor='a' className='text-sm text-slate-700'>
              Is Active
            </label>
          </div>
        </Field>
      </div>

      <div className='flex items-center justify-end gap-2 pt-2'>
        <button type='button' onClick={onClose} className='px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50'>
          Cancel
        </button>
        <button disabled={submitting} type='submit' className='px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white'>
          {submitting ? 'Assigning…' : 'Assign'}
        </button>
      </div>
      <style jsx>{`
        .inp {
          @apply h-[40px] mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30;
        }
      `}</style>
    </form>
  );
}

/* ------------------------------ Small atoms ------------------------------ */
const IconButton = ({ title, onClick, children, danger = false }) => (
  <button title={title} onClick={onClick} className={`w-[34px] h-[34px] inline-flex items-center justify-center rounded-lg border transition ${danger ? 'border-red-200 bg-white text-red-600 hover:bg-red-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
    {children}
  </button>
);

const IconMini = ({ title, onClick, children, danger = false }) => (
  <button title={title} onClick={onClick} className={`w-9 h-9 grid place-content-center rounded-lg backdrop-blur shadow border ${danger ? 'border-red-200 text-red-600 bg-white/85 hover:bg-white' : 'border-white/60 bg-white/85 hover:bg-white'}`}>
    {children}
  </button>
);

const ButtonGhost = ({ children, onClick, disabled }) => (
  <button disabled={disabled} onClick={onClick} className='px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 disabled:opacity-60'>
    {children}
  </button>
);

function Field({ label, children }) {
  return (
    <div>
      <label className='text-sm text-slate-600'>{label}</label>
      {children}
    </div>
  );
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
