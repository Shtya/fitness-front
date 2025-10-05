'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Utensils, Plus, Search as SearchIcon, LayoutGrid, Rows, Eye, Pencil, Trash2, CheckCircle2, Settings, RefreshCcw, Clock, ChevronUp, ChevronDown, Users as UsersIcon, ChevronRight, X as XIcon, Layers, Upload, Calendar } from 'lucide-react';

import api from '@/utils/axios';
import { Modal, StatCard, PageHeader } from '@/components/dashboard/ui/UI';
 import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import SelectSearch from '@/components/dashboard/ui/SelectSearch';
import { useValues } from '@/context/GlobalContext';
import { Notification } from '@/config/Notification';

const useDebounced = (value, delay = 350) => {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return deb;
};

export default function MealPlansPage() {
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

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [kpi, setKpi] = useState({
    total: 0,
    activePlans: 0,
    totalDays: 0,
    totalAssignments: 0,
  });

  const { usersByRole, fetchUsers } = useValues();

  useEffect(() => {
    fetchUsers('client');
    fetchUsers('coach');
  }, []);

  const optionsClient = usersByRole['client'] || [];

  const reqId = useRef(0);

  const fetchList = async ({ reset = false } = {}) => {
    setErr(null);
    if (reset) setLoading(true);
    const myId = ++reqId.current;
    try {
      const params = { page, limit, sortBy, sortOrder };
      if (debounced) params.search = debounced;

      const res = await api.get('/meal-plans', { params });
      const data = res.data || {};

      let records = [];
      let totalRecords = 0;
      if (Array.isArray(data.records)) {
        records = data.records;
        totalRecords = Number(data.total_records || data.records.length || 0);
      } else if (Array.isArray(data)) {
        records = data;
        totalRecords = data.length;
      }

      if (myId !== reqId.current) return;
      setTotal(totalRecords);
      setItems(prev => (reset ? records : [...prev, ...records]));
    } catch (e) {
      if (myId !== reqId.current) return;
      setErr(e?.response?.data?.message || 'Failed to load meal plans');
    } finally {
      if (myId === reqId.current) setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/meal-plans/stats');
      setKpi(res.data?.totals || {});
    } catch (e) {
      console.error('Failed to fetch meal plans stats:', e);
    }
  };

  useEffect(() => {
    setItems([]);
    setPage(1);
  }, [debounced, sortBy, sortOrder]);

  useEffect(() => {
    fetchList({ reset: page === 1 });
    fetchStats();
  }, [page, debounced, sortBy, sortOrder]);

  const hasMore = items.length < total;

  const toggleSortNewest = () => {
    if (sortBy === 'created_at') setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
    else {
      setSortBy('created_at');
      setSortOrder('DESC');
    }
  };

  const getOne = async id => {
    const res = await api.get(`/meal-plans/${id}`);
    return res.data;
  };

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
      await api.delete(`/meal-plans/${deleteTargetId}`);
      setItems(arr => arr.filter(x => x.id !== deleteTargetId));
      setTotal(t => Math.max(0, t - 1));
      Notification('Meal plan deleted successfully', 'success');
    } catch (e) {
      Notification(e?.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setDeleteTargetId(null);
    }
  };

  const createOrUpdate = async ({ id, payload }) => {
    const url = id ? `/meal-plans/${id}` : '/meal-plans';
    const method = id ? 'put' : 'post';
    const res = await api[method](url, payload);
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

  return (
    <div className='space-y-6'>
      <div className='rounded-xl md:rounded-2xl overflow-hidden border border-indigo-200'>
        <div className='relative p-4 md:p-8 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white'>
          <div className='absolute inset-0 opacity-20 bg-[radial-gradient(600px_200px_at_20%_-20%,white,transparent)]' />
          <div className='relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:gap-6 md:justify-between'>
            <PageHeader title='Meal Plans' subtitle='Create nutrition plans and assign to clients.' />
            <div className='flex items-center gap-2'>
              <Button onClick={() => setAddOpen(true)} color='primary' icon={<Plus className='w-4 h-4' />} name='New Meal Plan' className='bg-gradient-to-tr from-indigo-600 to-indigo-500' />
            </div>
          </div>

          <div className='flex items-center flex-wrap justify-start gap-3 mt-6'>
            {loading && page === 1 ? (
              <KpiSkeleton />
            ) : (
              <>
                <StatCard className='max-w-[220px] w-full' icon={Layers} title='Total Plans' value={kpi?.total} />
                <StatCard className='max-w-[220px] w-full' icon={CheckCircle2} title='Active Plans' value={kpi?.activePlans} />
                <StatCard className='max-w-[220px] w-full' icon={Calendar} title='Total Days' value={kpi?.totalDays} />
                <StatCard className='max-w-[220px] w-full' icon={UsersIcon} title='Total Assignments' value={kpi?.totalAssignments} />
              </>
            )}
          </div>
        </div>
      </div>

      <div className='flex items-center gap-2 mt-12 flex-wrap'>
        <div className='relative w-full md:w-60'>
          <SearchIcon className='absolute left-3 z-[10] top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
          <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder='Search meal plans...' className={`h-[40px] w-full pl-10 pr-3 rounded-xl bg-white text-black border border-slate-300 font-medium text-sm shadow-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-indigo-500/40 hover:border-indigo-400 transition`} />
        </div>

        <Button onClick={toggleSortNewest} color='outline' className='!w-fit !bg-white !rounded-xl' icon={<Clock size={16} />} name={<span className='flex items-center gap-2'> Newest {sortBy === 'created_at' ? sortOrder === 'ASC' ? <ChevronUp className='w-4 h-4 text-black' /> : <ChevronDown className='w-4 h-4 text-black' /> : null} </span>} />

        <Button className='!w-fit !bg-white !rounded-xl' onClick={() => setView(v => (v === 'grid' ? 'list' : 'grid'))} color='outline' icon={view === 'grid' ? <Rows size={16} /> : <LayoutGrid size={16} />} name={view === 'grid' ? 'List' : 'Grid'} />
      </div>

      {err ? <div className='p-3 rounded-xl bg-red-50 text-red-700 border border-red-100'>{err}</div> : null}

      {view === 'grid' ? <GridView loading={loading && page === 1} items={items} onPreview={openPreview} onEdit={openEdit} onDelete={handleDelete} onAssign={openAssign} /> : <ListView loading={loading && page === 1} items={items} onPreview={openPreview} onEdit={openEdit} onDelete={handleDelete} onAssign={openAssign} />}

      <div className='flex justify-center py-2'>{loading && page > 1 ? <Button disabled>Loading…</Button> : hasMore ? <Button onClick={() => setPage(p => p + 1)} color='outline' name='Load more' /> : null}</div>

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || 'Meal Plan'} maxW='max-w-4xl'>
        {preview && <MealPlanPreview plan={preview} />}
      </Modal>

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

      <Modal open={deleteModalOpen} onClose={closeDeleteModal} title='Delete meal plan?' maxW='max-w-md'>
        <div className='space-y-5'>
          <p className='text-slate-600'>This action cannot be undone. Are you sure you want to delete this meal plan?</p>
          <div className='flex items-center justify-end gap-3'>
            <Button type='button' color='danger' loading={deleting} onClick={confirmDelete} disabled={deleting} name={deleting ? 'Deleting…' : 'Delete'} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* -------------------------------- Grid View -------------------------------- */
function GridView({ loading, items, onPreview, onEdit, onDelete, onAssign }) {
  const spring = { type: 'spring', stiffness: 320, damping: 26 };

  const plural = (n, s, pluralS = s + 's') => `${n} ${n === 1 ? s : pluralS}`;

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
          <Utensils className='w-7 h-7 text-slate-500' />
        </div>
        <h3 className='mt-4 text-lg font-semibold'>No meal plans found</h3>
        <p className='text-sm text-slate-600 mt-1'>Try a different search query or create a new meal plan.</p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3'>
      {items.map(p => {
        const dayCount = p?.days?.length || 0;
        const totalFoods = p?.days?.reduce((sum, day) => sum + (day.foods?.length || 0), 0) || 0;

        return (
          <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='p-4 group relative rounded-xl border border-slate-200 bg-white hover:shadow-lg'>
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
              <div className='h-10 w-10 grid place-content-center rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow'>
                <Utensils className='w-5 h-5' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='font-semibold truncate' title={p?.name}>
                  {p?.name}
                </div>

                {p?.desc ? <div className='text-xs text-slate-600 mt-1 line-clamp-2'>{p.desc}</div> : null}

                {/* status + quick stats */}
                <div className='flex flex-wrap items-center gap-2 mt-2'>
                  <Badge color={p?.isActive ? 'green' : 'slate'}>{p?.isActive ? 'Active' : 'Inactive'}</Badge>
                  <Badge color='blue'>{plural(dayCount, 'day')}</Badge>
                  <Badge color='purple'>{plural(totalFoods, 'food')}</Badge>
                </div>
              </div>
            </div>

            {/* Days pills */}
            {dayCount > 0 && (
              <div className='mt-3 flex flex-wrap gap-1.5'>
                {p.days.map(d => (
                  <span key={d.id} className='px-2 py-0.5 text-[11px] rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200' title={d.day}>
                    {String(d.name || d.day).toLowerCase()}
                  </span>
                ))}
              </div>
            )}

            {/* Footer actions */}
            <div className='flex items-center justify-between mt-4'>
              <Button onClick={() => onAssign?.(p)} color='outline' icon={<UsersIcon className='w-4 h-4' />} name='Assign' className='px-3 py-1.5' />
            </div>
          </motion.div>
        );
      })}
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
  if (!items.length) return <div className='card-glow p-6 text-slate-500'>No meal plans.</div>;
  return (
    <div className='card-glow divide-y divide-slate-100'>
      {items.map(p => {
        const totalFoods = p?.days?.reduce((sum, day) => sum + (day.foods?.length || 0), 0) || 0;

        return (
          <div key={p.id} className='p-4 flex items-center justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white grid place-content-center'>
                <Utensils className='w-5 h-5' />
              </div>
              <div>
                <div className='font-medium'>{p?.name}</div>
                <div className='text-xs text-slate-500'>
                  {p?.isActive ? 'Active' : 'Inactive'} · {p?.days?.length || 0} day(s) · {totalFoods} food(s)
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
        );
      })}
    </div>
  );
}

/* ------------------------------- Preview ------------------------------- */
function MealPlanPreview({ plan }) {
  const [assignees, setAssignees] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get(`/meal-plans/${plan.id}/assignees`);
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
          const food = item.food || {};
          const quantity = item.quantity || 100;
          const factor = quantity / 100;

          return {
            calories: total.calories + (food.calories || 0) * factor,
            protein: total.protein + (food.protein || 0) * factor,
            carbs: total.carbs + (food.carbs || 0) * factor,
            fat: total.fat + (food.fat || 0) * factor,
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ) || { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <Badge color={plan.isActive ? 'green' : 'slate'}>{plan.isActive ? 'Active' : 'Inactive'}</Badge>
      </div>

      {plan.desc ? <div className='text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200'>{plan.desc}</div> : null}

      <div className='space-y-3'>
        {(plan.days || []).map((d, idx) => {
          const dayNutrition = calculateNutrition(d.foods);

          return (
            <div key={d.id || idx} className='rounded-xl border border-slate-200 p-3 bg-white'>
              <div className='flex items-center justify-between'>
                <div className='font-medium'>{d.name}</div>
                <div className='text-xs text-slate-500'>{String(d.day || '').toLowerCase()}</div>
              </div>

              {/* Nutrition Summary */}
              {d.foods?.length > 0 && (
                <div className='mt-2 grid grid-cols-4 gap-2 text-xs'>
                  <div className='text-center p-2 rounded bg-blue-50'>
                    <div className='font-semibold text-blue-700'>{Math.round(dayNutrition.calories)}</div>
                    <div className='text-blue-600'>kcal</div>
                  </div>
                  <div className='text-center p-2 rounded bg-green-50'>
                    <div className='font-semibold text-green-700'>{dayNutrition.protein.toFixed(1)}g</div>
                    <div className='text-green-600'>Protein</div>
                  </div>
                  <div className='text-center p-2 rounded bg-yellow-50'>
                    <div className='font-semibold text-yellow-700'>{dayNutrition.carbs.toFixed(1)}g</div>
                    <div className='text-yellow-600'>Carbs</div>
                  </div>
                  <div className='text-center p-2 rounded bg-red-50'>
                    <div className='font-semibold text-red-700'>{dayNutrition.fat.toFixed(1)}g</div>
                    <div className='text-red-600'>Fat</div>
                  </div>
                </div>
              )}

              <div className='mt-2 text-sm text-slate-600'>
                {(d.foods || []).length ? (
                  <ul className='space-y-2'>
                    {d.foods.map((foodItem, i) => {
                      const food = foodItem.food || {};
                      return (
                        <li key={foodItem.id || i} className='flex items-center justify-between p-2 rounded-lg bg-slate-50'>
                          <div>
                            <span className='font-medium'>{food.name}</span>
                            <div className='text-xs text-slate-500'>
                              {foodItem.quantity}
                              {food.unit} · {foodItem.mealType}
                            </div>
                          </div>
                          <div className='text-xs text-slate-500 text-right'>
                            <div>{Math.round((food.calories || 0) * (foodItem.quantity / 100))} kcal</div>
                            <div>P: {(food.protein || 0) * (foodItem.quantity / 100).toFixed(1)}g</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className='text-xs text-slate-400'>No foods yet</div>
                )}
              </div>
            </div>
          );
        })}
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

/* ------------------------------- Meal Plan Form ------------------------------- */
function MealPlanForm({ initial, onSubmit }) {
  const [name, setName] = useState(initial?.name || '');
  const [desc, setDesc] = useState(initial?.desc || '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [days, setDays] = useState(initial?.days || []);

  const { foods, fetchFoods } = useValues();

  useEffect(() => {
    fetchFoods();
  }, []);

  useEffect(() => {
    setName(initial?.name || '');
    setDesc(initial?.desc || '');
    setIsActive(initial?.isActive ?? true);
    setDays(initial?.days || []);
  }, [initial]);

  const DAYS = [
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' },
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
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
      foodId: '',
      quantity: 100,
      mealType: 'lunch',
      orderIndex: days[dayIndex].foods.length,
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
              foods: day.foods.map((food, j) => (j === foodIndex ? { ...food, [field]: value } : food)),
            }
          : day,
      ),
    );
  };

  const getSelectedFood = foodId => {
    return foods.find(f => f.id === foodId);
  };

  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        if (!name.trim()) {
          Notification('Plan name is required', 'error');
          return;
        }
        if (days.length === 0) {
          Notification('Add at least one day to the plan', 'error');
          return;
        }
        if (days.some(day => day.foods.length === 0)) {
          Notification('Each day must have at least one food item', 'error');
          return;
        }

        const payload = {
          name: name.trim(),
          desc: desc.trim() || null,
          isActive,
          days: days.map(day => ({
            day: day.day,
            name: day.name,
            foods: day.foods.map(foodItem => ({
              foodId: foodItem.foodId,
              quantity: Number(foodItem.quantity),
              mealType: foodItem.mealType,
              orderIndex: foodItem.orderIndex,
            })),
          })),
        };
        onSubmit?.(payload);
      }}
      className='space-y-4'>
      <Input label='Plan Name' name='name' value={name} onChange={v => setName(v)} required />

      <div>
        <label className='text-sm text-slate-600'>Description</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className='w-full rounded-xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-indigo-500/30' placeholder='Optional description...' />
      </div>

      <div className='flex items-center gap-2'>
        <input type='checkbox' id='isActive' checked={isActive} onChange={e => setIsActive(e.target.checked)} className='rounded border-slate-300 text-indigo-600 focus:ring-indigo-500' />
        <label htmlFor='isActive' className='text-sm text-slate-600'>
          Active Plan
        </label>
      </div>

      <div className='border-t pt-4'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='font-semibold'>Days & Foods</h3>
          <Button type='button' onClick={addDay} icon={<Plus className='w-4 h-4' />} name='Add Day' color='outline' className='!w-fit' />
        </div>

        {days.length === 0 ? (
          <div className='text-center py-8 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl'>
            <Utensils className='w-8 h-8 mx-auto mb-2 text-slate-400' />
            <p>No days added yet</p>
          </div>
        ) : (
          <div className='space-y-4'>
            {days.map((day, dayIndex) => (
              <div key={day.id} className='border border-slate-200 rounded-xl p-4'>
                <div className='flex items-center gap-3 mb-3'>
                  <div className='flex-1 grid grid-cols-2 gap-3'>
                    <div>
                      <label className='text-sm text-slate-600'>Day</label>
                      <select value={day.day} onChange={e => updateDay(dayIndex, 'day', e.target.value)} className='w-full h-[40px] rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-indigo-500/30'>
                        {DAYS.map(d => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className='text-sm text-slate-600'>Day Name</label>
                      <input type='text' value={day.name} onChange={e => updateDay(dayIndex, 'name', e.target.value)} className='w-full h-[40px] rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-indigo-500/30' placeholder='e.g., High Protein Day' />
                    </div>
                  </div>
                  <Button type='button' onClick={() => removeDay(dayIndex)} color='danger' icon={<Trash2 className='w-4 h-4' />} className='!w-fit mt-6' />
                </div>

                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <h4 className='font-medium text-sm'>Foods</h4>
                    <Button type='button' onClick={() => addFoodToDay(dayIndex)} icon={<Plus className='w-4 h-4' />} name='Add Food' color='outline' className='!w-fit !text-xs' />
                  </div>

                  {day.foods.length === 0 ? (
                    <div className='text-center py-4 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg'>No foods added to this day</div>
                  ) : (
                    day.foods.map((foodItem, foodIndex) => {
                      const selectedFood = getSelectedFood(foodItem.foodId);
                      return (
                        <div key={foodItem.id} className='flex items-center gap-3 p-3 border border-slate-100 rounded-lg bg-slate-50'>
                          <div className='flex-1 grid grid-cols-4 gap-2'>
                            <div>
                              <label className='text-xs text-slate-600'>Food</label>
                              <select value={foodItem.foodId} onChange={e => updateFoodInDay(dayIndex, foodIndex, 'foodId', e.target.value)} className='w-full h-[34px] rounded-lg border border-slate-200 px-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500/30' required>
                                <option value=''>Select food...</option>
                                {foods.map(food => (
                                  <option key={food.id} value={food.id}>
                                    {food.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className='text-xs text-slate-600'>Quantity</label>
                              <input type='number' value={foodItem.quantity} onChange={e => updateFoodInDay(dayIndex, foodIndex, 'quantity', e.target.value)} className='w-full h-[34px] rounded-lg border border-slate-200 px-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500/30' min='1' required />
                            </div>
                            <div>
                              <label className='text-xs text-slate-600'>Meal Type</label>
                              <select value={foodItem.mealType} onChange={e => updateFoodInDay(dayIndex, foodIndex, 'mealType', e.target.value)} className='w-full h-[34px] rounded-lg border border-slate-200 px-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500/30'>
                                {MEAL_TYPES.map(meal => (
                                  <option key={meal.value} value={meal.value}>
                                    {meal.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className='text-xs text-slate-600'>Nutrition</label>
                              <div className='text-xs text-slate-500 h-[34px] flex items-center'>{selectedFood ? <>{Math.round((selectedFood.calories || 0) * (foodItem.quantity / 100))} kcal</> : '--'}</div>
                            </div>
                          </div>
                          <Button type='button' onClick={() => removeFoodFromDay(dayIndex, foodIndex)} color='danger' icon={<Trash2 className='w-3 h-3' />} className='!w-fit !h-[34px]' />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='flex items-center justify-end gap-2 pt-4 border-t'>
        <Button name='Save Meal Plan' type='submit' />
      </div>
    </form>
  );
}

/* --------------------------------- Assign Meal Plan --------------------------------- */
function AssignMealPlanForm({ planId, onClose, onAssigned, optionsClient }) {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

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
    if (selectedUsers.length === 0) {
      Notification('Please select at least one user', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const athleteIds = selectedUsers.map(u => u.id);
      await api.post(`/meal-plans/${planId}/assign`, { userId: athleteIds[0] });

      onAssigned?.();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to assign meal plan';
      Notification(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-3'>
      <Field label='Select Users'>
        <SelectSearch value={null} onChange={addUser} options={optionsClient.filter(o => !selectedUsers.some(u => u.id === o.id))} placeholder='Search and select users...' searchable={true} />
      </Field>

      {selectedUsers.length > 0 && (
        <div className='flex flex-wrap gap-2'>
          {selectedUsers.map(user => (
            <div key={user.id} className='inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-full text-sm'>
              {user.label}
              <button type='button' onClick={() => removeUser(user.id)} className='hover:text-indigo-200'>
                <XIcon className='w-3 h-3' />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className='flex items-center justify-end gap-2 pt-2'>
        <Button disabled={submitting || selectedUsers.length === 0} type='submit' color='primary' name={submitting ? 'Assigning…' : 'Assign'} loading={submitting} />
      </div>
    </form>
  );
}

/* ------------------------------ Small atoms ------------------------------ */
const IconButton = ({ title, onClick, children, danger = false }) => (
  <button title={title} onClick={onClick} className={`flex-none w-[40px] h-[40px] inline-flex items-center justify-center rounded-lg border transition ${danger ? 'border-red-200 bg-white text-red-600 hover:bg-red-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
    {children}
  </button>
);

const IconMini = ({ title, onClick, children, danger = false }) => (
  <button title={title} onClick={onClick} className={`w-9 h-9 grid place-content-center rounded-lg backdrop-blur shadow border ${danger ? 'border-red-200 text-red-600 bg-white/85 hover:bg-white' : 'border-white/60 bg-white/85 hover:bg-white'}`}>
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

 
import clsx from 'clsx';

const COLORS = {
  blue: 'bg-blue-100 text-blue-800 border border-blue-200',
  green: 'bg-green-100 text-green-800 border border-green-200',
  red: 'bg-red-100 text-red-800 border border-red-200',
  yellow: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  gray: 'bg-gray-100 text-gray-800 border border-gray-200',
  indigo: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
};

export function Badge({ color = 'gray', children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full',
        COLORS[color] || COLORS.gray
      )}
    >
      {children}
    </span>
  );
}
