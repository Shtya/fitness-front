 
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Dumbbell, Plus,  LayoutGrid, Rows, Eye, Pencil, Trash2, CheckCircle2, Settings,  Clock, ChevronUp, ChevronDown, Users as UsersIcon, Calendar as CalendarIcon, ChevronRight, X as XIcon, Layers, Upload, ArrowUp, ArrowDown, Search, Info } from 'lucide-react';

import api from '@/utils/axios';
import { Modal, StatCard, PageHeader, Badge } from '@/components/dashboard/ui/UI';
import Button from '@/components/atoms/Button';
import SelectSearch from '@/components/dashboard/ui/SelectSearch';
import { useValues } from '@/context/GlobalContext';
import PlanForm from '@/components/pages/dashboard/plans/PlanForm';
import { Notification } from '@/config/Notification';

const useDebounced = (value, delay = 350) => {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return deb;
};

export default function PlansPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [searchText, setSearchText] = useState('');
  const debounced = useDebounced(searchText, 350);

  const [view, setView] = useState('list');
  const [preview, setPreview] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [assignOpen, setAssignOpen] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  // NEW: KPI state from /plans/overview
  const [kpi, setKpi] = useState({
    totalPlans: 0,
    activePlans: 0,
    avgDays: 0,
  });

  const { usersByRole, fetchUsers } = useValues();

  useEffect(() => {
    fetchUsers('client');
    fetchUsers('coach');
  }, []);

  const optionsClient = usersByRole['client'] || [];
  const optionsCoach = usersByRole['coach'] || [];

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

  useEffect(() => {
    setItems([]);
    setPage(1);
  }, [debounced, sortBy, sortOrder]);

  useEffect(() => {
    fetchList({ reset: page === 1 });
  }, [page, debounced, sortBy, sortOrder]);

  const hasMore = items.length < total;

  const toggleSortNewest = () => {
    if (sortBy === 'created_at') setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
    else {
      setSortBy('created_at');
      setSortOrder('DESC');
    }
  };

  /* ------------------------------ CRUD actions ------------------------------ */
  const getOne = async id => {
    const res = await api.get(`/plans/${id}`);
    return res.data;
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const handleDelete = id => {
    setDeleteTargetId(id);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteModalOpen(false);
    setDeleteTargetId(null);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setDeleting(true);
      await api.delete(`/plans/${deleteTargetId}`);
      setItems(arr => arr.filter(x => x.id !== deleteTargetId));
      setTotal(t => Math.max(0, t - 1));
      Notification('Plan deleted successfully', 'success');
    } catch (e) {
      Notification(e?.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setDeleteTargetId(null);
    }
  };

  const createOrUpdate = async ({ id, payload }) => {
    const url = id ? `/plans/${id}` : '/plans';
    const method = id ? 'put' : 'post';
    await api[method](url, payload)
      .then(res => {
        setItems(arr => [res.data, ...arr]);
        // console.log(res.data , items );
        return res.data;
      })
      .catch(err => {
        Notification(err.response.data?.message, 'error');
      });
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

  const fetchKpis = async () => {
    try {
      const res = await api.get('/plans/overview');
      const summary = res?.data?.summary;

      if (summary) {
        setKpi(summary);
      }
    } catch (e) {}
  };
  useEffect(() => {
    fetchKpis();
  }, []);

  return (
    <div className='space-y-6'>
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

          <div className='flex items-center flex-wrap justify-start gap-3 mt-6'>
            {loading && page === 1 ? (
              <KpiSkeleton />
            ) : (
              <>
                {/* Plans */}
                <StatCard className=' max-w-[220px] w-full' icon={Layers} title='Total Plans' value={kpi?.plans?.total} />
                <StatCard className=' max-w-[220px] w-full' icon={CheckCircle2} title='Active Plans' value={kpi?.plans?.active} />

                <StatCard className=' max-w-[220px] w-full' icon={Settings} title='Exercises Attached' value={kpi?.structure?.exercisesAttached} />

                <StatCard className=' max-w-[220px] w-full' icon={Settings} title='Avg. Assignees/Plan' value={kpi?.averages?.assigneesPerPlan} />
              </>
            )}
          </div>
        </div>
      </div>

      <div className='flex items-center gap-2 mt-12 flex-wrap'>
        <div className='relative w-full md:w-60'>
          <Search className='absolute left-3 z-[10] top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
          <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder='Search name...' className={` h-[40px] w-full pl-10 pr-3 rounded-xl bg-white text-black border border-slate-300 font-medium text-sm shadow-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-indigo-500/40 hover:border-indigo-400 transition `} />
        </div>
        <Button onClick={toggleSortNewest} color='outline' className='!w-fit !bg-white !rounded-xl' icon={<Clock size={16} />} name={<span className='flex items-center gap-2'> Newest {sortBy === 'created_at' ? sortOrder === 'ASC' ? <ChevronUp className='w-4 h-4 text-black' /> : <ChevronDown className='w-4 h-4 text-black' /> : null} </span>} />

        <Button className='!w-fit !bg-white !rounded-xl' onClick={() => setView(v => (v === 'grid' ? 'list' : 'grid'))} color='outline' icon={view === 'grid' ? <Rows size={16} /> : <LayoutGrid size={16} />} name={view === 'grid' ? 'List' : 'Grid'} />
      </div>

      {err ? <div className='p-3 rounded-xl bg-red-50 text-red-700 border border-red-100'>{err}</div> : null}

      {view === 'grid' ? <GridView loading={loading && page === 1} items={items} onPreview={openPreview} onEdit={openEdit} onDelete={handleDelete} onAssign={openAssign} /> : <ListView loading={loading && page === 1} items={items} onPreview={openPreview} onEdit={openEdit} onDelete={handleDelete} onAssign={openAssign} />}

      <div className='flex justify-center py-2'>{loading && page > 1 ? <Button disabled>Loading…</Button> : hasMore ? <Button onClick={() => setPage(p => p + 1)} color='outline' name='Load more' /> : null}</div>

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || 'Plan'} maxW='max-w-4xl'>
        {preview && <PlanPreview plan={preview} />}
      </Modal>

      {/* Add Plan */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title='Create Plan' maxW='max-w-3xl'>
        <PlanForm
          optionsCoach={optionsCoach}
          optionsClient={optionsClient}
          onSubmit={async payload => {
            try {
              const saved = await createOrUpdate({ payload });
              setTotal(t => t + 1);
              setAddOpen(false);
            } catch (e) {}
          }}
        />
      </Modal>

      {/* Edit  */}
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

      <Modal open={!!assignOpen} onClose={() => setAssignOpen(null)} title={`Assign: ${assignOpen?.name || ''}`} maxW='max-w-md'>
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

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title='Import Weekly Template' maxW='max-w-3xl'>
        <ImportTemplate
          optionsClient={optionsClient} // 👈 add this
          onClose={() => setImportOpen(false)}
          onImported={async () => {
            setImportOpen(false);
            setItems([]);
            setPage(1);
            await fetchList({ reset: true });
          }}
        />
      </Modal>

      {/* Delete Plan */}
      <Modal open={deleteModalOpen} onClose={closeDeleteModal} title='Delete plan?' maxW='max-w-md'>
        <div className='space-y-5'>
          <p className='text-slate-600'>This action cannot be undone. Are you sure you want to delete this plan?</p>
          <div className='flex items-center justify-end gap-3'>
            <Button type='button' color='danger' loading={deleting} onClick={confirmDelete} disabled={deleting} name={deleting ? 'Deleting…' : 'Delete'} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* -------------------------------- Grid View -------------------------------- */
export function GridView({ loading, items, onPreview, onEdit, onDelete, onAssign }) {
  const spring = { type: 'spring', stiffness: 320, damping: 26 };

  const plural = (n, s, pluralS = s + 's') => `${n} ${n === 1 ? s : pluralS}`;
  const isoDate = d => {
    if (!d) return null;
    try {
      return new Date(d).toISOString().slice(0, 10);
    } catch {
      return null;
    }
  };

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
      {items.map(p => {
        const dayCount = p?.days?.length || 0;

        const assignments = Array.isArray(p?.assignments) ? p.assignments : [];
        const totalAssignees = assignments.length;
        const activeAssignees = assignments.filter(a => a?.isActive).length;

        return (
          <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='  p-4 group relative rounded-xl border border-slate-200 bg-white hover:shadow-lg'>
            {/* Hover actions */}
            <div className='absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition'>
              <IconMini title='Preview' onClick={() => onPreview?.(p)}>
                <Eye className='w-4 h-4' />
              </IconMini>
              <IconMini title='Edit' onClick={() => onEdit?.(p)}>
                <Pencil className='w-4 h-4' />
              </IconMini>
              <IconMini title='Delete' onClick={() => onDelete?.(p.id)} danger>
                <Trash2 className='w-4 h-4' />
              </IconMini>
            </div>

            {/* Header */}
            <div className='flex items-start gap-3'>
              <div className='h-10 w-10 grid place-content-center rounded-xl bg-gradient text-white shadow'>
                <Dumbbell className='w-5 h-5' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='font-semibold truncate' title={p?.name}>
                  {p?.name}
                </div>

                {p?.notes ? <div className='text-xs text-slate-600 mt-1 line-clamp-2'>{p.notes}</div> : null}

                {/* status + quick stats */}
                <div className='flex flex-wrap items-center gap-2 mt-2'>
                  <Badge color={p?.isActive ? 'green' : 'slate'}>{p?.isActive ? 'Active' : 'Inactive'}</Badge>
                  <Badge color='blue'>{plural(dayCount, 'day')}</Badge>
                  <Badge color='purple' title='Total assignees'>
                    {plural(totalAssignees, 'user')}
                  </Badge>
                  {totalAssignees > 0 && (
                    <Badge color='emerald' title='Active assignees'>
                      {activeAssignees}/{totalAssignees} active
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Days pills */}
            {dayCount > 0 && (
              <div className='mt-3 flex flex-wrap gap-1.5'>
                {p.days.map(d => (
                  <span key={d.id} className='px-2 py-0.5 text-[11px] rounded-full bg-slate-100 text-slate-700 border border-slate-200' title={d.day}>
                    {String(d.name || d.day).toLowerCase()}
                  </span>
                ))}
              </div>
            )}

            {/* Schedule & meta */}
            <div className='mt-3 grid grid-cols-1 gap-2 text-xs text-slate-600'>
              <div className='flex items-center gap-2'>
                <Clock className='w-3.5 h-3.5' />
                <span>
                  Created: {isoDate(p?.created_at) ?? '—'} · Updated: {isoDate(p?.updated_at) ?? '—'}
                </span>
              </div>
            </div>

            {/* Footer actions */}
            <div className='flex items-center justify-between mt-4'>
              <Button onClick={() => onAssign?.(p)} color='outline' icon={<UsersIcon className='w-4 h-4' />} name={`Assign${totalAssignees ? ` (${totalAssignees})` : ''}`} className='px-3 py-1.5' />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* -------------------------------- List View -------------------------------- */
export function ListView({ loading, items, onPreview, onEdit, onDelete, onAssign }) {
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
              <div className='font-medium'>{p?.name}</div>
              <div className='text-xs text-slate-500'>
                {p?.isActive ? 'Active' : 'Inactive'} · {p?.days?.length || 0} day(s) · {p?.assignments?.length || 0} user(s)
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
export function PlanPreview({ plan }) {
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

/* --------------------------------- Assign --------------------------------- */
export function AssignForm({ planId, onClose, onAssigned, optionsCoach, optionsClient }) {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Popup state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [conflictMsg, setConflictMsg] = useState('');
  const lastPayloadRef = useRef(null); // نخزن آخر payload لإعادة الإرسال مع confirm

  const addUser = userId => {
    if (!userId) return;
    if (selectedUsers.some(u => u.id === userId)) return;

    const user = optionsClient.find(u => u.id === userId);
    if (!user) return;

    setSelectedUsers(prev => [...prev, user]);
  };

  const removeUser = userId => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (selectedUsers.length === 0) return;

    setSubmitting(true);
    try {
      const athleteIds = selectedUsers.map(u => u.id);
      const payload = {
        athleteIds,
        isActive: true,
      };
      lastPayloadRef.current = payload;

      await api.post(`/plans/${planId}/assign`, payload);
      Notification('Assigned successfully', 'success');
      onAssigned?.();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to assign';
      // لو الـ API رجّع رسالة التعارض
      if (typeof msg === 'string' && msg.toLowerCase().includes('already assigned')) {
        setConflictMsg(msg);
        setConfirmOpen(true);
      } else {
        Notification(msg, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmMove = async () => {
    if (!lastPayloadRef.current) return;
    setConfirmLoading(true);
    try {
      const payload = { ...lastPayloadRef.current, confirm: 'yes' };
      await api.post(`/plans/${planId}/assign`, payload);
      setConfirmOpen(false);
      Notification('Users moved to this plan', 'success');
      onAssigned?.();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to move users';
      Notification(msg, 'error');
    } finally {
      setConfirmLoading(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className='space-y-3 relative'>
      {/* Small confirmation popup (popover) */}
      <AnimatePresence>
        {confirmOpen ? (
          <motion.div className='  bg-white shadow-xl'>
            <div className='p-4'>
              <div className='text-sm text-slate-800 whitespace-pre-wrap'>{conflictMsg || 'Some users are already on another plan.'}</div>
              <div className='mt-3 text-xs text-slate-500'>Move them to this plan? This will deactivate any existing active assignments.</div>

              <div className='mt-4 flex items-center justify-end gap-2'>
                <Button type='button' color='red' name='Cancel' onClick={() => setConfirmOpen(false)} disabled={confirmLoading} />
                <Button type='button' color='primary' name={confirmLoading ? 'Moving…' : 'Yes, move'} onClick={handleConfirmMove} loading={confirmLoading} />
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            <Field label='Select Users'>
              <SelectSearch value={null} onChange={addUser} options={optionsClient.filter(o => !selectedUsers.some(u => u.id === o.id))} placeholder='Search and select users...' searchable={true} />
            </Field>

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
              <Button disabled={submitting || selectedUsers.length === 0} type='submit' color='primary' name={submitting ? 'Assigning…' : 'Assign'} loading={submitting} />
            </div>
          </>
        )}
      </AnimatePresence>
    </form>
  );
}

/* ------------------------------- Importer -------------------------------- */
export function ImportTemplate({ onClose, onImported, optionsClient = [] }) {
  const [selectedUsers, setSelectedUsers] = useState([]); // MULTI
  const [raw, setRaw] = useState(`{
  "name": "Push Pull Leg",
  "program": {
    "days": [
      {
        "id": "saturday",
        "dayOfWeek": "saturday",
        "nameOfWeek": "Write Name of today's exercise",
        "name": "Push Day 1 (Chest & Triceps)",
        "exercises": [
          { "id": "ex1",  "name": "Machine Flat Chest Press", "orderIndex": 1 },
          { "id": "ex3",  "name": "Machine Incline Chest Press", "orderIndex": 2 },
          { "id": "ex2",  "name": "Cable Crossover Press", "orderIndex": 3 },
          { "id": "ex4",  "name": "Lateral Raises", "orderIndex": 4 },
          { "id": "ex5",  "name": "Overhead Tricep Extension (Rope)", "orderIndex": 5 },
          { "id": "ex6n", "name": "Reverse Pec Deck Machine", "orderIndex": 6 }
        ]
      }
    ]
  }
}`);
  const [err, setErr] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const DAYS = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const safeDay = d => {
    const v = String(d || '').toLowerCase();
    return DAYS.includes(v) ? v : 'monday';
  };

  // --- Multi-select handlers ---
  const addUser = userId => {
    if (!userId) return;
    if (selectedUsers.some(u => u.id === userId)) return;
    const user = optionsClient.find(u => u.id === userId);
    if (!user) return;
    setSelectedUsers(prev => [...prev, user]);
  };
  const removeUser = userId => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  // Accept exercise objects like your sample; map to { order, exerciseId }
  const normalize = obj => {
    const srcDays = obj?.program?.days || [];
    let missingExerciseIds = 0;

    const days = srcDays.map((d, di) => {
      const dow = safeDay(d.dayOfWeek || d.id || '');
      const nameOfWeek = (d.nameOfWeek ?? d.name ?? `${dow} #${di + 1}`) || `${dow} #${di + 1}`;

      const exsRaw = Array.isArray(d.exercises) ? d.exercises : [];
      const exercises = exsRaw
        .map((e, i) => {
          const exerciseId = e?.exerciseId || e?.id || e?.exercise?.id || '';
          if (!exerciseId) {
            missingExerciseIds++;
            return null;
          }
          const order = e?.order ?? e?.orderIndex ?? i + 1;
          return { order, exerciseId };
        })
        .filter(Boolean);

      return { dayOfWeek: dow, nameOfWeek, exercises };
    });

    return { days, missingExerciseIds };
  };

  // Live preview
  const preview = useMemo(() => {
    try {
      const obj = JSON.parse(raw || '{}');
      const { days, missingExerciseIds } = normalize(obj);
      return {
        ok: true,
        dayCount: days.length,
        perDayCounts: days.map(d => d.exercises.length),
        missingExerciseIds,
      };
    } catch (e) {
      return { ok: false, err: e?.message || 'Invalid JSON' };
    }
  }, [raw]);

  const onSubmit = async () => {
    setErr(null);

    if (!selectedUsers.length) {
      setErr('Please select at least one athlete to assign.');
      return;
    }

    let obj;
    try {
      obj = JSON.parse(raw || '{}');
    } catch (e) {
      setErr(e?.message || 'Invalid JSON');
      return;
    }

    const { days, missingExerciseIds } = normalize(obj);

    const finalPayload = {
      name: (obj.name || 'Program').trim(),
      isActive: true, // always active
      program: {
        days: days.map(d => ({
          dayOfWeek: d.dayOfWeek,
          nameOfWeek: d.nameOfWeek,
          exercises: d.exercises.map(ex => ({
            order: ex.order,
            exerciseId: ex.exerciseId,
          })),
        })),
      },
    };

    // Basic validations
    if (!finalPayload.name) {
      setErr('Plan name is required.');
      return;
    }
    if (!finalPayload.program.days.length) {
      setErr('Add at least one day in program.days.');
      return;
    }
    if (finalPayload.program.days.some(d => !d.exercises?.length)) {
      setErr('Each day must include at least one exercise.');
      return;
    }
    if (missingExerciseIds > 0) {
      Notification(`${missingExerciseIds} exercise(s) without exerciseId were ignored.`, 'error');
    }

    setSubmitting(true);
    try {
      // 1) Create the plan
      const res = await api.post('/plans/import', finalPayload, {
        headers: { 'Content-Type': 'application/json' },
      });
      const savedPlan = res.data;

      // 2) Always assign to all selected athletes
      const athleteIds = selectedUsers.map(u => u.id);
      await api.post(`/plans/${savedPlan.id}/assign`, {
        athleteIds,
        isActive: true,
        confirm: 'yes',
        removeOthers: true,
      });

      Notification('Template imported & assigned successfully', 'success');
      onImported?.();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Import failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='space-y-3'>
      {/* Multi athlete select */}
      <Field label='Assign to athletes (required)'>
        <SelectSearch value={null} onChange={addUser} options={optionsClient.filter(o => !selectedUsers.some(u => u.id === o.id))} placeholder='Search and select athlete...' searchable />
        {selectedUsers.length > 0 && (
          <div className='mt-2 flex flex-wrap gap-2'>
            {selectedUsers.map(user => (
              <div key={user.id} className='inline-flex items-center gap-2 px-3 py-1.5 bg-gradient opacity-90 text-blue-800 rounded-full text-sm'>
                {user.label}
                <button type='button' onClick={() => removeUser(user.id)} className='hover:text-blue-900' title='Remove'>
                  <XIcon className='w-3 h-3' />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className='mt-1 text-[11px] text-slate-500'>{selectedUsers.length} selected</div>
      </Field>

      <Field label='Template JSON (Plan with program.days)'>
        <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={14} className='w-full rounded-xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-indigo-500/30' />
      </Field>

      {/* Live preview */}
      <div className='rounded-xl border border-slate-200 p-3 bg-slate-50/50 text-xs text-slate-600'>
        {preview.ok ? (
          <div>
            <span className='font-semibold'>Preview:</span> {preview.dayCount} day(s)
            {preview.perDayCounts?.length ? <> · per-day exercises: [{preview.perDayCounts.join(', ')}]</> : null}
            {preview.missingExerciseIds > 0 ? (
              <>
                {' '}
                · ⚠ {preview.missingExerciseIds} missing <code>exerciseId</code> ignored
              </>
            ) : null}
          </div>
        ) : (
          <div className='text-red-600'>Invalid JSON: {preview.err}</div>
        )}
      </div>

      {err ? <div className='p-2 rounded bg-red-50 text-red-600 text-sm border border-red-100'>{err}</div> : null}

      <div className='flex items-center justify-end gap-2'>
        <Button onClick={onClose} color='outline' name='Cancel' />
        <Button onClick={onSubmit} disabled={submitting || !preview.ok} color='primary' name={submitting ? 'Importing…' : 'Import & Assign'} />
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

export function KpiSkeleton() {
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
