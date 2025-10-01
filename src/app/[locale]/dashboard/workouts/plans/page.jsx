/* 
	- i need put validation here 
		- to write the name 
		- and should choose at leatest one day in the program 
			and the day should have al letest one exercise to make submit 

		use yup and react hook form 
*/
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Plus, Search as SearchIcon, LayoutGrid, Rows, Eye, Pencil, Trash2, CheckCircle2, Settings, RefreshCcw, Clock, ChevronUp, ChevronDown, Users as UsersIcon, Calendar as CalendarIcon, ChevronRight, X as XIcon, Layers, Upload, ArrowUp, ArrowDown, Search } from 'lucide-react';

import api from '@/utils/axios';
import { Modal, StatCard, PageHeader } from '@/components/dashboard/ui/UI';
import { Badge } from '@/components/site/UI';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import SelectSearch from '@/components/dashboard/ui/SelectSearch';
import { useValues } from '@/context/GlobalContext';
import PlanForm from '@/components/pages/dashboard/plans/PlanForm';
import { Notification } from '@/config/Notification';

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

/* 
	i need here doesn't add the info of hte exercise i need select it  and if not exist show button to create a new exercise with all info of this exercise and after create can choose it
	not add the name  and the day 
*/
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
  const [view, setView] = useState('list');
  const [preview, setPreview] = useState(null); // plan (with days)
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState(null); // plan (with days)
  const [assignOpen, setAssignOpen] = useState(null); // plan to assign
  const [importOpen, setImportOpen] = useState(false);

  const { usersByRole, fetchUsers } = useValues();

  useEffect(() => {
    fetchUsers('client');
    fetchUsers('coach');
  }, []);

  const optionsClient = usersByRole['client'] || [];
  const optionsCoach = usersByRole['coach'] || [];

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
  const kpiActive = items.filter(p => p?.isActive).length;
  const kpiDays = items.reduce((acc, p) => acc + (p?.days?.length || 0), 0);
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
      // alert(e?.response?.data?.message || 'Delete failed');
    }
  };

  const createOrUpdate = async ({ id, payload }) => {
    const url = id ? `/plans/${id}` : '/plans';
    const method = id ? 'put' : 'post';
    const res = await api[method](url, payload).then(res=>{}).catch(err => {
			Notification(err.response.data?.message , "error")
		})
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
        <div className='relative p-4 md:pm-8 md:p-8 bg-gradient text-white'>
          <div className='absolute inset-0 opacity-20 bg-[radial-gradient(600px_200px_at_20%_-20%,white,transparent)]' />
          <div className='relative z-10 flex flex-row md:items-center gap-3 md:gap-6 justify-between'>
            <PageHeader title='Plans' subtitle='Create programs, organize days, and assign to athletes.' />
            <div className='flex items-center gap-2'>
              <Button onClick={() => setImportOpen(true)} color='outline' icon={<Upload className='w-4 h-4' />} name='Import Template' className='bg-white/90 text-slate-900 border-white/70' />
              <Button onClick={() => setAddOpen(true)} color='primary' icon={<Plus className='w-4 h-4' />} name='New Plan' className='bg-gradient-to-tr from-indigo-600 to-blue-500' />
            </div>
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
        <div className='relative w-full md:w-60'>
          <Search className='absolute left-3 z-[10] top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
          <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder='Search name...' className={` h-[40px] w-full pl-10 pr-3 rounded-xl bg-white text-black border border-slate-300 font-medium text-sm shadow-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-indigo-500/40 hover:border-indigo-400 transition `} />
        </div>
        <Button onClick={toggleSortNewest} color='outline' className='!w-fit !bg-white !rounded-xl' icon={<Clock size={16} />} name={<span className='flex items-center gap-2'> Newest {sortBy === 'created_at' ? sortOrder === 'ASC' ? <ChevronUp className='w-4 h-4 text-black' /> : <ChevronDown className='w-4 h-4 text-black' /> : null} </span>} />

        <Button className='!w-fit !bg-white !rounded-xl' onClick={() => setView(v => (v === 'grid' ? 'list' : 'grid'))} color='outline' icon={view === 'grid' ? <Rows size={16} /> : <LayoutGrid size={16} />} name={view === 'grid' ? 'List' : 'Grid'} />
      </div>

      {/* Errors */}
      {err ? <div className='p-3 rounded-xl bg-red-50 text-red-700 border border-red-100'>{err}</div> : null}

      {/* Content */}
      {view === 'grid' ? <GridView loading={loading && page === 1} items={items} onPreview={openPreview} onEdit={openEdit} onDelete={handleDelete} onAssign={openAssign} /> : <ListView loading={loading && page === 1} items={items} onPreview={openPreview} onEdit={openEdit} onDelete={handleDelete} onAssign={openAssign} />}

      {/* Load more */}
      <div className='flex justify-center py-2'>{loading && page > 1 ? <Button disabled>Loading…</Button> : hasMore ? <Button onClick={() => setPage(p => p + 1)} color='outline' name='Load more' /> : null}</div>

      {/* Preview */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || 'Plan'} maxW='max-w-4xl'>
        {preview && <PlanPreview plan={preview} />}
      </Modal>

      {/* Add */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title='Create Plan' maxW='max-w-3xl'>
        <PlanForm
          optionsCoach={optionsCoach}
          optionsClient={optionsClient}
          onSubmit={async payload => {
            try {
              const saved = await createOrUpdate({ payload });
              setItems(arr => [saved, ...arr]);
              setTotal(t => t + 1);
              setAddOpen(false);
            } catch (e) {}
          }}
        />
      </Modal>

      {/* Edit */}
      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Edit: ${editRow?.name || ''}`} maxW='max-w-3xl'>
        {editRow && (
          <PlanForm
            optionsCoach={optionsCoach}
            optionsClient={optionsClient}
            initial={editRow}
            onSubmit={async payload => {
              try {
                const saved = await createOrUpdate({ id: editRow.id, payload });
                setItems(arr => arr.map(p => (p.id === editRow.id ? saved : p)));
                setEditRow(null);
              } catch (e) {}
            }}
          />
        )}
      </Modal>

      {/* Assign */}
      <Modal open={!!assignOpen} onClose={() => setAssignOpen(null)} title={`Assign: ${assignOpen?.name || ''}`} maxW='max-w-xl'>
        {assignOpen && (
          <AssignForm
            optionsCoach={optionsCoach}
            optionsClient={optionsClient}
            planId={assignOpen.id}
            onClose={() => setAssignOpen(null)}
            onAssigned={() => {
              setAssignOpen(null);
            }}
          />
        )}
      </Modal>

      {/* Import Template */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title='Import Weekly Template' maxW='max-w-3xl'>
        <ImportTemplate
          onClose={() => setImportOpen(false)}
          onImported={async () => {
            setImportOpen(false);
            setItems([]);
            setPage(1);
            await fetchList({ reset: true });
          }}
        />
      </Modal>
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
            <Button onClick={() => onAssign(p)} color='outline' icon={<UsersIcon className='w-4 h-4' />} name='Assign' className='px-3 py-1.5' />
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
            <div className='w-10 h-10 rounded-xl bg-main/90 text-white grid bg-gradient place-content-center'>
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
            <Button onClick={() => onAssign(p)} color='outline' icon={<UsersIcon className='w-4 h-4' />} name='Assign' className='px-2.5 py-1.5' />
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
              <div className='text-xs text-slate-500'>{String(d.day || d.dayOfWeek || '').toLowerCase()}</div>
            </div>
            <div className='mt-2 text-sm text-slate-600'>
              {(d.exercises || []).length ? (
                <ul className='list-disc pl-5 space-y-1'>
                  {d.exercises.map((ex, i) => (
                    <li key={ex.id || ex.exerciseId || i} className='flex items-center justify-between'>
                      <span>{ex.name || ex.exercise?.name || `Exercise #${i + 1}`}</span>
                      {ex.targetReps || ex.targetSets || ex.restSeconds || ex.rest || ex.tempo ? (
                        <span className='text-xs text-slate-500'>
                          {ex.targetSets ? `Sets ${ex.targetSets}` : ''} {ex.targetReps ? `· Reps ${ex.targetReps}` : ''} {ex.restSeconds ? `· Rest ${ex.restSeconds}s` : ex.rest ? `· Rest ${ex.rest}s` : ''} {ex.tempo ? `· Tempo ${ex.tempo}` : ''}
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
                {a?.athlete?.name || a?.athlete?.email || a?.athlete?.id}
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
// function PlanForm({ initial, onSubmit, optionsCoach, optionsClient }) {
//   const [name, setName] = useState(initial?.name || '');
//   const [days, setDays] = useState(
//     (initial?.days || []).map(d => ({
//       id: d.id,
//       name: d.name || '',
//       dayOfWeek: (d.day || d.dayOfWeek || 'monday').toLowerCase(),
//       orderIndex: d.orderIndex || 0,
//       exercises: (d.exercises || []).map(ex => ({
//         exerciseId: ex.exerciseId || ex.id || ex.exercise?.id || '',
//         name: ex.name || ex.exercise?.name || '',
//         targetReps: ex.targetReps || '',
//         targetSets: ex.targetSets ?? null,
//         restSeconds: ex.restSeconds ?? null,
//         rest: ex.rest ?? ex.restSeconds ?? null,
//         tempo: ex.tempo ?? '',
//         altExerciseId: '', // UI field for fallback
//       })),
//     })),
//   );

//   const addDay = () =>
//     setDays(arr => [
//       ...arr,
//       {
//         name: 'New Day',
//         dayOfWeek: 'monday',
//         orderIndex: arr.length,
//         exercises: [],
//       },
//     ]);

//   const removeDay = idx => setDays(arr => arr.filter((_, i) => i !== idx));

//   const moveDay = (idx, dir) =>
//     setDays(arr => {
//       const n = [...arr];
//       const j = idx + dir;
//       if (j < 0 || j >= n.length) return n;
//       [n[idx], n[j]] = [n[j], n[idx]];
//       return n.map((d, i) => ({ ...d, orderIndex: i }));
//     });

//   const updateDay = (idx, patch) => setDays(arr => arr.map((d, i) => (i === idx ? { ...d, ...patch } : d)));

//   const addEx = idx =>
//     setDays(arr =>
//       arr.map((d, i) =>
//         i === idx
//           ? {
//               ...d,
//               exercises: [...d.exercises, { exerciseId: '', name: '', targetReps: '', targetSets: null, rest: null, tempo: '', altExerciseId: '' }],
//             }
//           : d,
//       ),
//     );

//   const removeEx = (idx, exIdx) => setDays(arr => arr.map((d, i) => (i === idx ? { ...d, exercises: d.exercises.filter((_, j) => j !== exIdx) } : d)));

//   const moveEx = (dayIdx, exIdx, dir) =>
//     setDays(arr =>
//       arr.map((d, i) => {
//         if (i !== dayIdx) return d;
//         const list = [...d.exercises];
//         const j = exIdx + dir;
//         if (j < 0 || j >= list.length) return d;
//         [list[exIdx], list[j]] = [list[j], list[exIdx]];
//         return { ...d, exercises: list };
//       }),
//     );

//   const updateEx = (idx, exIdx, patch) =>
//     setDays(arr =>
//       arr.map((d, i) =>
//         i === idx
//           ? {
//               ...d,
//               exercises: d.exercises.map((ex, j) => (j === exIdx ? { ...ex, ...patch } : ex)),
//             }
//           : d,
//       ),
//     );

//   // small exercise search
//   const searchExercise = async (q, setter) => {
//     try {
//       const res = await api.get('/plan-exercises', { params: { page: 1, limit: 8, search: q } });
//       const recs = Array.isArray(res.data?.records) ? res.data.records : Array.isArray(res.data) ? res.data : [];
//       setter(recs);
//     } catch {
//       setter([]);
//     }
//   };

//   return (
//     <form
//       onSubmit={async e => {
//         e.preventDefault();
//         const payload = {
//           name,
//           isActive: true,
//           program: {
//             days: days.map((d, dayIndex) => ({
//               dayOfWeek: d.dayOfWeek,
//               name: d.name || `${d.dayOfWeek} #${dayIndex + 1}`,
//               orderIndex: dayIndex,
//               exercises: d.exercises.map((ex, i) =>
//                 ex.exerciseId
//                   ? {
//                       order: i + 1,
//                       exerciseId: ex.exerciseId,
//                       altExerciseId: ex.altExerciseId ? toArray(ex.altExerciseId) : undefined,
//                       targetReps: ex.targetReps || undefined,
//                       targetSets: ex.targetSets || undefined,
//                       rest: ex.rest ?? undefined,
//                       tempo: ex.tempo || undefined,
//                     }
//                   : {
//                       order: i + 1,
//                       name: ex.name || `Exercise #${i + 1}`,
//                       targetReps: ex.targetReps || '10',
//                       targetSets: ex.targetSets || 3,
//                       rest: ex.rest ?? 90,
//                       tempo: ex.tempo || undefined,
//                     },
//               ),
//             })),
//           },
//         };
//         onSubmit?.(payload);
//       }}
//       className='space-y-4'>
//       <Field label='Name'>
//         <Input value={name} onChange={setName} placeholder='Plan name' />
//       </Field>

//       {/* Days builder */}
//       <div className='rounded-xl border border-slate-200 '>
//         <span onClick={addDay} className='flex items-center gap-1 w-full justify-end text-sm cursor-pointer mb-3 '>
//           <Plus className='w-4 h-4' /> Add Day
//         </span>

//         {!days.length ? null : (
//           <div className='space-y-3'>
//             {days.map((d, idx) => (
//               <div key={idx} className='rounded-lg border border-slate-200 p-3 bg-white'>
//                 <div className='flex items-center gap-2 mb-3'>
//                   <Input value={d.name} onChange={value => updateDay(idx, { name: value })} placeholder='Day name e.g. Push A' className='flex-none max-w-[300px] ' />
//                   <Select value={d.dayOfWeek} onChange={value => updateDay(idx, { dayOfWeek: value })} options={DAYS.map(day => ({ id: day, label: day.charAt(0).toUpperCase() + day.slice(1) }))} className='w-[150px]' />
//                   <div className='flex items-center gap-1'>
//                     <IconButton onClick={() => removeDay(idx)} title='Remove day' danger>
//                       <XIcon className='w-4 h-4' />
//                     </IconButton>
//                   </div>
//                 </div>

//                 {/* Exercises */}
//                 <div className='mt-3'>
//                   <span onClick={() => addEx(idx)} className='flex items-center gap-1 w-full justify-end text-sm cursor-pointer mb-3 '>
//                     <Plus className='w-4 h-4' /> Add Exercise
//                   </span>

//                   <div className='mt-2 space-y-2'>
//                     {d.exercises.map((ex, exIdx) => (
//                       <ExercisePickerRow key={exIdx} ex={ex} index={exIdx} onChange={patch => updateEx(idx, exIdx, patch)} onRemove={() => removeEx(idx, exIdx)} onMoveUp={() => moveEx(idx, exIdx, -1)} onMoveDown={() => moveEx(idx, exIdx, +1)} searchExercise={searchExercise} />
//                     ))}
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       <div className='flex items-center justify-end gap-2 pt-2'>
//         <Button type='submit' color='primary' name='Save Plan' />
//       </div>
//     </form>
//   );
// }

function ExercisePickerRow({ ex, index, onChange, onRemove, onMoveUp, onMoveDown, searchExercise }) {
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
    <div className='rounded-lg border border-slate-200 p-3'>
      <div className='flex items-center justify-between mb-3'>
        <div className='text-xs text-slate-500'>Order: {index + 1}</div>
        <div className='flex gap-1'>
          <IconButton onClick={onMoveUp} title='Move up'>
            <ArrowUp className='w-4 h-4' />
          </IconButton>
          <IconButton onClick={onMoveDown} title='Move down'>
            <ArrowDown className='w-4 h-4' />
          </IconButton>
          <IconButton onClick={onRemove} title='Remove' danger>
            <XIcon className='w-4 h-4' />
          </IconButton>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-12 gap-2'>
        <div className='md:col-span-4'>
          <Input value={ex.exerciseId} onChange={value => onChange({ exerciseId: value })} placeholder='Exercise ID (paste)' />

          <div className='relative mt-2'>
            <Input value={q} onChange={setQ} placeholder='Search exercises…' iconLeft={<SearchIcon className='w-4 h-4' />} />
            {opts.length > 0 && (
              <div className='absolute z-10 w-full mt-1 rounded-lg border border-slate-200 bg-white shadow max-h-56 overflow-auto'>
                {opts.map(o => (
                  <button
                    key={o.id}
                    type='button'
                    onClick={() => {
                      onChange({
                        exerciseId: o.id,
                        name: o.name,
                        targetReps: o.targetReps || ex.targetReps,
                      });
                      setQ('');
                      setOpts([]);
                    }}
                    className='w-full text-left px-3 py-2 text-sm hover:bg-slate-50'>
                    {o.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className='md:col-span-3'>
          <Input value={ex.name || ''} onChange={value => onChange({ name: value })} placeholder='Name (optional if ID set)' />
        </div>

        <div className='md:col-span-2'>
          <Input value={ex.targetReps || ''} onChange={value => onChange({ targetReps: value })} placeholder='Reps e.g. 8-10' />
        </div>

        <div className='md:col-span-1'>
          <Input type='number' value={ex.targetSets ?? ''} onChange={value => onChange({ targetSets: value ? Number(value) : null })} placeholder='Sets' />
        </div>

        <div className='md:col-span-1'>
          <Input type='number' value={ex.rest ?? ''} onChange={value => onChange({ rest: value ? Number(value) : null })} placeholder='Rest' />
        </div>

        <div className='md:col-span-1'>
          <Input value={ex.tempo || ''} onChange={value => onChange({ tempo: value })} placeholder='Tempo' />
        </div>

        <div className='md:col-span-12'>
          <Input value={ex.altExerciseId || ''} onChange={value => onChange({ altExerciseId: value })} placeholder='Alt exercise ID(s) comma separated' />
          <div className='text-[11px] text-slate-500 mt-1'>
            Only <b>id, name, targetSets, targetReps, rest, tempo, img, video</b> are used.
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Assign --------------------------------- */
function AssignForm({ planId, onClose, onAssigned, optionsCoach, optionsClient }) {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const addUser = userId => {
    if (!userId) return;
    // already selected?
    if (selectedUsers.some(u => u.id === userId)) return;

    // find full object from optionsClient
    const user = optionsClient.find(u => u.id === userId);
    if (!user) return;

    setSelectedUsers(prev => [...prev, user]);
  };

  const removeUser = userId => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        if (selectedUsers.length === 0) {
          return;
        }

        setSubmitting(true);
        try {
          const athleteIds = selectedUsers.map(u => u.id);
          await api.post(`/plans/${planId}/assign`, {
            athleteIds,
            isActive: true,
          });
          onAssigned?.();
        } catch (err) {
          alert(err?.response?.data?.message || 'Assign failed');
        } finally {
          setSubmitting(false);
        }
      }}
      className='space-y-3'>
      <Field label='Select Users'>
        {/* Hide already-selected users from the list (UI-only, SelectSearch logic untouched) */}
        <SelectSearch value={null} onChange={addUser} options={optionsClient.filter(o => !selectedUsers.some(u => u.id === o.id))} placeholder='Search and select users...' searchable={true} />
      </Field>

      {/* Selected users chips */}
      {selectedUsers.length > 0 && (
        <div className='flex flex-wrap gap-2'>
          {selectedUsers.map(user => (
            <div key={user.id} className='inline-flex items-center gap-2 px-3 py-1.5 bg-gradient opacity-90 text-blue-800 rounded-full text-sm'>
              {user.label}
              <button type='button' onClick={() => removeUser(user.id)} className='hover:text-blue-900'>
                <XIcon className='w-3 h-3' />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className='flex items-center justify-end gap-2 pt-2'>
        <Button type='button' onClick={onClose} color='outline' name='Cancel' />
        <Button disabled={submitting || selectedUsers.length === 0} type='submit' color='primary' name={submitting ? 'Assigning…' : 'Assign'} loading={submitting} />
      </div>
    </form>
  );
}

/* ------------------------------- Importer -------------------------------- */
function ImportTemplate({ onClose, onImported }) {
  const [userId, setUserId] = useState('');
  const [coachId, setCoachId] = useState('');
  const [raw, setRaw] = useState(`{
  "name": "Push Pull Leg",
  "userId": "36eae674-a063-4287-b378-e3cab0364b91",
  "coachId": "36eae674-a063-4287-b378-e3cab0364b91",
  "program": {
    "days": [
      {
        "id": "saturday",
        "dayOfWeek": "saturday",
        "name": "Push Day 1 (Chest & Triceps)",
        "exercises": [
          { "id": "ex1", "name": "Machine Flat Chest Press", "targetSets": 3, "targetReps": "8", "rest": 90, "tempo": "1/1/1", "img": "/uploads/smith-machine-flat-chest-press/img-1.png", "video": "/uploads/smith-machine-flat-chest-press/vid-1.mp4" },
          { "id": "ex3", "name": "Machine Incline Chest Press", "targetSets": 3, "targetReps": "10-12", "rest": 90, "tempo": "1/1/1", "img": "/uploads/machine-incline-chest-press/img-1.png", "video": "/uploads/machine-incline-chest-press/vid-1.mp4" },
          { "id": "ex2", "name": "Cable Crossover Press", "targetSets": 3, "targetReps": "12-15", "rest": 75, "tempo": "1/1/1", "img": "/uploads/cable-crossover-press/img-1.png", "video": "/uploads/cable-crossover-press/vid-1.mp4" },
          { "id": "ex4", "name": "Lateral Raises", "targetSets": 3, "targetReps": "12-15", "rest": 60, "tempo": "1/1/1", "img": "/uploads/lateral-raises/img-1.png", "video": "/uploads/lateral-raises/vid-1.mp4" },
          { "id": "ex5", "name": "Overhead Tricep Extension (Rope)", "targetSets": 3, "targetReps": "12-15", "rest": 60, "tempo": "1/1/1", "img": "/uploads/one-hand-tricep-pushdown/img-1.png", "video": "/uploads/one-hand-tricep-pushdown/vid-1.mp4" },
          { "id": "ex6n", "name": "Reverse Pec Deck Machine", "targetSets": 3, "targetReps": "12-15", "rest": 60, "tempo": "1/1/1", "img": "/uploads/reverse-fly-machine/img-1.png", "video": "/uploads/reverse-fly-machine/vid-1.mp4" }
        ]
      }
    ]
  }
}`);
  const [err, setErr] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const cleanExercise = e => ({
    id: e.id,
    name: e.name,
    targetSets: e.targetSets,
    targetReps: e.targetReps ?? '10',
    rest: e.rest ?? e.restSeconds,
    tempo: e.tempo ?? null,
    img: e.img ?? null,
    video: e.video ?? null,
  });

  const onSubmit = async () => {
    setErr(null);
    try {
      const obj = JSON.parse(raw || '{}');
      const final = {
        name: obj.name || 'Program',
        userId: userId || obj.userId, // allow override
        coachId: coachId || obj.coachId || undefined,
        program: {
          days: (obj.program?.days || []).map((d, i) => ({
            id: (d.id || d.dayOfWeek || '').toLowerCase(),
            dayOfWeek: (d.dayOfWeek || d.id || 'monday').toLowerCase(),
            name: d.name || `${d.dayOfWeek || d.id || 'day'} #${i + 1}`,
            exercises: (d.exercises || []).map(cleanExercise),
          })),
        },
      };

      if (!final.userId) {
        setErr('userId is required (type it above or include it in JSON).');
        return;
      }

      setSubmitting(true);
      await api.post('/plans/import', final, { headers: { 'Content-Type': 'application/json' } });
      onImported?.();
    } catch (e) {
      setErr(e?.message || 'Invalid JSON');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='space-y-3'>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
        <Field label='User ID (required)'>
          <Input value={userId} onChange={setUserId} placeholder='athlete UUID' />
        </Field>
        <Field label='Coach ID (optional)'>
          <Input value={coachId} onChange={setCoachId} placeholder='coach UUID' />
        </Field>
      </div>

      <Field label='Template JSON (weeklyProgram shape)'>
        <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={14} className='w-full rounded-xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-indigo-500/30' />
      </Field>

      {err ? <div className='p-2 rounded bg-red-50 text-red-600 text-sm border border-red-100'>{err}</div> : null}

      <div className='flex items-center justify-end gap-2'>
        <Button onClick={onClose} color='outline' name='Cancel' />
        <Button onClick={onSubmit} disabled={submitting} color='primary' name={submitting ? 'Importing…' : 'Import & Activate'} />
      </div>
    </div>
  );
}

/* ------------------------------ Small atoms ------------------------------ */
export const IconButton = ({ title, onClick, children, danger = false }) => (
  <button title={title} onClick={onClick} className={`flex-none w-[40px] h-[40px] inline-flex items-center justify-center rounded-lg border transition ${danger ? 'border-red-200 bg-white text-red-600 hover:bg-red-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
    {children}
  </button>
);

const IconMini = ({ title, onClick, children, danger = false }) => (
  <button title={title} onClick={onClick} className={`w-9 h-9 grid place-content-center rounded-lg backdrop-blur shadow border ${danger ? 'border-red-200 text-red-600 bg-white/85 hover:bg-white' : 'border-white/60 bg-white/85 hover:bg-white'}`}>
    {children}
  </button>
);

export function Field({ label, children }) {
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
