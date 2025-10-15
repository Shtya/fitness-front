/* 
 
  and this is the props of the <Button></Button> component ( name,
  disabled,
  icon,
  srcImg,
  onClick,
  href,
  className = '',
  color = 'primary',
  loading = false,
  type = 'button', )


  - in the create meal plans form i need the form to be validated with yup and react-hook-form 
  and also where is teh details fo the meal plan like the meals and the nutrition details
   the meals detilas should exist inside the plans for example the first meal his time is optional and have those items ( name, description, calories, protein, carbs, fat, fiber, sodium, sugar, vitamin, mineral ) and can write more that items in the one meal and the plan have more that one meal for exmapel have the first meal and the second meal and the third meal and the fourth meal and the fifth meal  
   and there is another things is missgin to be this matter is completed to the client work on it 


   and also i get the all clients with this why (   const { usersByRole, fetchUsers } = useValues();
  useEffect(() => {
    fetchUsers('client');
    fetchUsers('coach');
  }, [fetchUsers]);
  const optionsClient = usersByRole['client'] || []; ) to pass them to any dropdown to assign plan for exmaple 

  and also another things when make any action on the button check to send loading as props to take user experience for the client to knwo what happend
  and also add icon to show the details of the meal plan
 

  -  remove the tabs i need it one only page the meals plans and when click on any meal plan can show this all details his assign client on this meal and rmeove the log and teh suggestions and the reports form here 
   here in the meal plan he will add only one day and this will apply on the all days if here need to add custom things in somedays can make this 
   remove teh input of unit it's always g  and the protein , carbs , fat , fiber , sodiumn , suger , vitamins and add icon to add فيتامين وكتابه اسمه ومعاده قبل ولا بعد الاكل والافضل يتاخد معاه ايه 
   button of show detials doens't show any thing the button doenst work 
*/
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Edit, Trash2, Users, Calendar, Target, TrendingUp, Eye, UserPlus, Pill, Clock, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

import api from '@/utils/axios';
import { useUser } from '@/hooks/useUser';
import { useTranslations } from 'next-intl';
import { Modal, StatCard } from '@/components/dashboard/ui/UI';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import { Notification } from '@/config/Notification';
import Select from '@/components/atoms/Select';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import { useValues } from '@/context/GlobalContext';

// ---------------------------
// Validation (yup)
// ---------------------------
const mealItemSchema = yup.object().shape({
  name: yup.string().trim().required('Required'),
  description: yup.string().trim().nullable(),
  calories: yup.number().typeError('Number').min(0).required('Required'),
  protein: yup.number().typeError('Number').min(0).required('Required'),
  carbs: yup.number().typeError('Number').min(0).required('Required'),
  fat: yup.number().typeError('Number').min(0).required('Required'),
  fiber: yup.number().typeError('Number').min(0).required('Required'),
  sodium: yup.number().typeError('Number').min(0).required('Required'),
  sugar: yup.number().typeError('Number').min(0).required('Required'),
});

const supplementSchema = yup.object().shape({
  kind: yup.string().oneOf(['vitamin', 'mineral', 'other']).required(),
  name: yup.string().trim().required('Required'),
  timing: yup.string().oneOf(['before', 'after', 'with']).required(),
  bestWith: yup.string().trim().nullable(),
});

const mealSchema = yup.object().shape({
  title: yup.string().trim().required('Required'),
  time: yup.string().trim().nullable(), // optional
  items: yup.array().of(mealItemSchema).min(1, 'Add at least one food item'),
  supplements: yup.array().of(supplementSchema),
});

const baseFormSchema = yup.object().shape({
  name: yup.string().trim().required('Plan name is required'),
  description: yup.string().trim().nullable(),
  // Base day meals (applied to all days unless customized)
  baseMeals: yup.array().of(mealSchema).min(1, 'Add at least one meal'),
  // Toggle to allow custom day overrides
  customizeDays: yup.boolean(),
  dayOverrides: yup.object().shape({
    monday: yup.array().of(mealSchema),
    tuesday: yup.array().of(mealSchema),
    wednesday: yup.array().of(mealSchema),
    thursday: yup.array().of(mealSchema),
    friday: yup.array().of(mealSchema),
    saturday: yup.array().of(mealSchema),
    sunday: yup.array().of(mealSchema),
  }),
});

// ---------------------------
// Page
// ---------------------------
export default function NutritionManagementPage() {
  const t = useTranslations();
  const { user: USER } = useUser();
  const { usersByRole, fetchUsers } = useValues();

  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState(null);

  const [plans, setPlans] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  const [addPlanOpen, setAddPlanOpen] = useState(false);
  const [editPlan, setEditPlan] = useState(null);

  const [assignPlanOpen, setAssignPlanOpen] = useState(null);
  const [deletePlanId, setDeletePlanId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Assignments (for details)
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // fetch clients/coaches for dropdowns
  useEffect(() => {
    fetchUsers('client');
    fetchUsers('coach');
  }, [fetchUsers]);

  const optionsClient = usersByRole['client'] || [];

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const { data } = await api.get('/nutrition/stats');
      setStats(data);
    } catch (e) {
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    setListLoading(true);
    try {
      const { data } = await api.get('/nutrition/meal-plans');
      setPlans(data.records || []);
    } catch (e) {
      setPlans([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchStats(), fetchPlans()]);
    })();
  }, [fetchStats, fetchPlans]);

  const fetchAssignments = useCallback(async planId => {
    setLoadingAssignments(true);
    try {
      const { data } = await api.get(`/nutrition/meal-plans/${planId}/assignments`);
      setAssignments(data || []);
    } catch (e) {
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  const onViewDetails = async plan => {
    setSelectedPlan(plan);
    setDetailsOpen(true);
    await fetchAssignments(plan.id);
  };

  const onCreate = async (payload, setSubmitting) => {
    try {
      await api.post('/nutrition/meal-plans', payload);
      Notification('Meal plan created successfully', 'success');
      setAddPlanOpen(false);
      await fetchPlans();
    } catch (e) {
      Notification(e?.response?.data?.message || 'Create failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const onUpdate = async (planId, payload, setSubmitting) => {
    try {
      await api.put(`/nutrition/meal-plans/${planId}`, payload);
      Notification('Meal plan updated successfully', 'success');
      setEditPlan(null);
      await fetchPlans();
    } catch (e) {
      Notification(e?.response?.data?.message || 'Update failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const onAssign = async (planId, userId, setSubmitting) => {
    try {
      await api.post(`/nutrition/meal-plans/${planId}/assign`, { userId });
      Notification('Meal plan assigned successfully', 'success');
      setAssignPlanOpen(null);
      await fetchAssignments(planId);
      await fetchPlans();
    } catch (e) {
      Notification(e?.response?.data?.message || 'Assignment failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!deletePlanId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/nutrition/meal-plans/${deletePlanId}`);
      Notification('Meal plan deleted successfully', 'success');
      setDeleteOpen(false);
      setDeletePlanId(null);
      await fetchPlans();
    } catch (e) {
      Notification('Failed to delete meal plan', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className='space-y-5 sm:space-y-6'>
      <GradientStatsHeader onClick={() => setAddPlanOpen(true)} btnName={'New Plan'} title='Nutrition Management' desc='Create meal plans, assign to clients, and view plan details on one page.' loadingStats={loadingStats}>
        <StatCard icon={Target} title='Total Plans' value={stats?.totals?.total} />
        <StatCard icon={TrendingUp} title='Active Plans' value={stats?.totals?.activePlans} />
        <StatCard icon={Calendar} title='Total Days' value={stats?.totals?.totalDays} />
        <StatCard icon={Users} title='Assignments' value={stats?.totals?.totalAssignments} />
      </GradientStatsHeader>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className='rounded-lg bg-white p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-lg font-semibold text-slate-800'>Meal Plans</h3>
            <Button name='Create New Plan' icon={<Plus size={16} />} onClick={() => setAddPlanOpen(true)} color='primary' />
          </div>

          {listLoading ? (
            <div className='py-8 text-slate-500 text-center'>Loading plans...</div>
          ) : plans.length === 0 ? (
            <div className='py-8 text-slate-500 text-center'>No meal plans found</div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {plans.map(plan => (
                <div key={plan.id} className='p-4 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors'>
                  <div className='flex items-center justify-between mb-2'>
                    <h4 className='font-medium text-slate-800 flex items-center gap-2'>
                      {plan.name}
                      <Info className='text-slate-400' size={16} />
                    </h4>
                    <div className='flex items-center gap-1'>
                      <button onClick={() => setEditPlan(plan)} className='p-1 rounded hover:bg-slate-200 text-slate-600' aria-label='Edit plan'>
                        <Edit size={14} />
                      </button>
                      <button onClick={() => setAssignPlanOpen(plan)} className='p-1 rounded hover:bg-slate-200 text-slate-600' aria-label='Assign plan'>
                        <UserPlus size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setDeletePlanId(plan.id);
                          setDeleteOpen(true);
                        }}
                        className='p-1 rounded hover:bg-red-100 text-red-600'
                        aria-label='Delete plan'>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <p className='text-sm text-slate-600 mb-2 line-clamp-3'>{plan.desc}</p>
                  <div className='text-xs text-slate-500'>
                    {plan.days?.length || 0} days • {plan.assignments?.length || 0} assignments
                  </div>

                  <div className='mt-3 flex items-center gap-2'>
                    <Button name='Show details' icon={<Eye size={14} />} onClick={() => onViewDetails(plan)} color='outline' className='text-xs px-2 py-1' />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Create */}
      <Modal open={addPlanOpen} onClose={() => setAddPlanOpen(false)} title='Create Meal Plan'>
        <MealPlanForm onSubmitPayload={onCreate} submitLabel='Create Plan' />
      </Modal>

      {/* Edit */}
      <Modal open={!!editPlan} onClose={() => setEditPlan(null)} title={editPlan ? `Edit: ${editPlan.name}` : ''}>
        {editPlan && <MealPlanForm initialPlan={editPlan} onSubmitPayload={(payload, setSubmitting) => onUpdate(editPlan.id, payload, setSubmitting)} submitLabel='Update Plan' />}
      </Modal>

      {/* Assign */}
      <Modal open={!!assignPlanOpen} onClose={() => setAssignPlanOpen(null)} title={assignPlanOpen ? `Assign: ${assignPlanOpen.name}` : ''}>
        {assignPlanOpen && <AssignPlanForm plan={assignPlanOpen} clients={optionsClient} onAssign={(userId, setSubmitting) => onAssign(assignPlanOpen.id, userId, setSubmitting)} />}
      </Modal>

      {/* Details */}
      <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)} title={selectedPlan ? `Meal Plan Details: ${selectedPlan.name}` : 'Meal Plan Details'}>
        {selectedPlan && <PlanDetailsView plan={selectedPlan} assignments={assignments} loadingAssignments={loadingAssignments} />}
      </Modal>

      {/* Delete dialog */}
      <ConfirmDialog
        loading={deleteLoading}
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeletePlanId(null);
        }}
        title='Delete meal plan?'
        message='This action cannot be undone.'
        confirmText='Delete'
        onConfirm={onDelete}
      />
    </div>
  );
}

// ---------------------------
// MealPlanForm
// ---------------------------
function MealPlanForm({ initialPlan, onSubmitPayload, submitLabel }) {
  // Map initial server shape into form shape
  const defaultMeals = [{ title: 'Meal 1', time: '', items: [blankItem()], supplements: [] }];

  const initialFormValues = useMemo(() => {
    if (!initialPlan) {
      return {
        name: '',
        description: '',
        baseMeals: defaultMeals,
        customizeDays: false,
        dayOverrides: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: [],
        },
      };
    }

    // If editing, try to hydrate baseMeals from first day
    const firstDayMeals = (initialPlan.days?.[0]?.meals?.length ? initialPlan.days[0].meals : mapFoodsToMeals(initialPlan.days?.[0]?.foods)) || defaultMeals;

    return {
      name: initialPlan.name || '',
      description: initialPlan.desc || '',
      baseMeals: cloneMeals(firstDayMeals),
      customizeDays: false,
      dayOverrides: {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      },
    };
  }, [initialPlan]);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(baseFormSchema),
    defaultValues: initialFormValues,
    mode: 'onBlur',
  });

  const customizeDays = watch('customizeDays');

  // baseMeals field array
  const {
    fields: baseMeals,
    append: appendMeal,
    remove: removeMeal,
  } = useFieldArray({
    control,
    name: 'baseMeals',
  });

  const onSubmit = async data => {
    // Build payload:
    // - If customizeDays = false → copy baseMeals to all 7 days.
    // - If customizeDays = true → copy baseMeals to all days, then override the non-empty overrides.
    const daysKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const base = mealsToServerMeals(data.baseMeals);
    const daysPayload = daysKeys.map(dayKey => {
      const overrideMeals = data.dayOverrides?.[dayKey] || [];
      const toUse = customizeDays && overrideMeals.length > 0 ? mealsToServerMeals(overrideMeals) : base;
      return {
        day: dayKey,
        name: capitalize(dayKey),
        meals: toUse,
      };
    });

    const payload = {
      name: data.name,
      desc: data.description || '',
      days: daysPayload,
    };

    await onSubmitPayload(payload, val => {
      // allow parent to flip submitting state if needed, but we rely on RHF isSubmitting + Button.loading
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
      {/* Name / Desc */}
      <div className='grid grid-cols-1 gap-3'>
        <Controller name='name' control={control} render={({ field }) => <Input label='Plan Name' name='name' value={field.value} onChange={field.onChange} required error={errors?.name?.message} />} />
        <Controller name='description' control={control} render={({ field }) => <Input label='Description' name='description' value={field.value} onChange={field.onChange} error={errors?.description?.message} />} />
      </div>

      {/* Base Day */}
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <h4 className='font-medium text-slate-800 flex items-center gap-2'>
            Base Day Meals (applies to all days)
            <Clock size={16} className='text-slate-500' />
          </h4>
          <Button name='Add Meal' icon={<Plus size={14} />} onClick={() => appendMeal({ title: `Meal ${baseMeals.length + 1}`, time: '', items: [blankItem()], supplements: [] })} color='outline' />
        </div>

        {baseMeals.map((m, mealIndex) => (
          <div key={m.id || mealIndex} className='border border-slate-200 rounded-lg p-3 bg-slate-50'>
            <div className='flex items-center justify-between mb-2'>
              <div className='flex items-center gap-2'>
                <span className='text-sm font-medium text-slate-700'>Meal {mealIndex + 1}</span>
              </div>
              <button type='button' onClick={() => removeMeal(mealIndex)} className='text-red-600 hover:text-red-700'>
                <X size={16} />
              </button>
            </div>

            {/* Meal title / time */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              <Controller name={`baseMeals.${mealIndex}.title`} control={control} render={({ field }) => <Input label='Meal Title' value={field.value} onChange={field.onChange} required error={errors?.baseMeals?.[mealIndex]?.title?.message} />} />
              <Controller name={`baseMeals.${mealIndex}.time`} control={control} render={({ field }) => <Input label='Time (optional)' value={field.value || ''} onChange={field.onChange} placeholder='e.g., 08:00' error={errors?.baseMeals?.[mealIndex]?.time?.message} />} />
            </div>

            {/* Items */}
            <MealItemsBlock control={control} basePath={`baseMeals.${mealIndex}.items`} errors={errors} />

            {/* Supplements */}
            <SupplementsBlock control={control} basePath={`baseMeals.${mealIndex}.supplements`} errors={errors} />
          </div>
        ))}

        {errors?.baseMeals?.message && <p className='text-sm text-red-600'>{errors.baseMeals.message}</p>}
      </div>

      {/* Customize Days Toggle */}
      <Controller
        name='customizeDays'
        control={control}
        render={({ field }) => (
          <div className='flex items-center gap-2'>
            <input id='customizeDays' type='checkbox' checked={!!field.value} onChange={e => field.onChange(e.target.checked)} className='h-4 w-4 border-slate-300 rounded' />
            <label htmlFor='customizeDays' className='text-sm text-slate-700'>
              Customize specific days (optional)
            </label>
          </div>
        )}
      />

      {customizeDays && <DayOverrides control={control} errors={errors} />}

      <div className='flex items-center justify-end gap-2 pt-2'>
        <Button name={submitLabel} type='submit' color='primary' loading={isSubmitting} />
      </div>
    </form>
  );
}

// ---------------------------
// AssignPlanForm
// ---------------------------
function AssignPlanForm({ plan, clients, onAssign }) {
  const [userId, setUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const options = (clients || []).map(c => ({ id: c.id, label: c.name || c.email || `#${c.id}` }));

  const submit = async e => {
    e.preventDefault();
    if (!userId) return;
    setSubmitting(true);
    await onAssign(userId, setSubmitting);
    setSubmitting(false);
  };

  return (
    <form onSubmit={submit} className='space-y-4'>
      <div>
        <h4 className='font-medium text-slate-800 mb-2'>Assign "{plan.name}" to:</h4>
        <Select options={options} value={userId} onChange={setUserId} placeholder='Select a client' />
      </div>
      <div className='flex items-center justify-end'>
        <Button name='Assign Plan' type='submit' disabled={!userId} loading={submitting} color='primary' />
      </div>
    </form>
  );
}

// ---------------------------
// PlanDetailsView
// ---------------------------
function PlanDetailsView({ plan, assignments, loadingAssignments }) {
  const [open, setOpen] = useState({}); // expand/collapse per day

  const toggle = key => setOpen(p => ({ ...p, [key]: !p[key] }));

  // plan.days may be server schema; support both {meals:[]} or legacy {foods:[]}
  return (
    <div className='space-y-4'>
      <div className='text-sm text-slate-600'>{plan.desc}</div>

      <div className='border rounded-lg overflow-hidden'>
        {plan.days?.map((d, idx) => {
          const dayKey = d.day || `day-${idx}`;
          const meals = d.meals || mapFoodsToMeals(d.foods || []);
          const isOpen = !!open[dayKey];

          return (
            <div key={dayKey} className='border-b last:border-b-0'>
              <button type='button' onClick={() => toggle(dayKey)} className='w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50'>
                <div className='flex items-center gap-2'>
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className='font-medium text-slate-800'>{capitalize(d.name || d.day || `Day ${idx + 1}`)}</span>
                </div>
                <span className='text-xs text-slate-500'>{meals.length} meals</span>
              </button>

              {isOpen && (
                <div className='px-3 pb-3 space-y-3 bg-slate-50/60'>
                  {meals.map((m, mi) => (
                    <div key={mi} className='rounded-md bg-white border p-3'>
                      <div className='flex items-center justify-between'>
                        <div className='font-medium text-slate-800'>{m.title || `Meal ${mi + 1}`}</div>
                        <div className='text-xs text-slate-500 flex items-center gap-1'>
                          <Clock size={14} /> {m.time || '—'}
                        </div>
                      </div>

                      {/* Items */}
                      {m.items?.length > 0 && (
                        <div className='mt-2'>
                          <div className='text-sm font-medium text-slate-700 mb-1'>Items</div>
                          <div className='overflow-x-auto'>
                            <table className='w-full text-sm'>
                              <thead>
                                <tr className='text-left text-slate-500'>
                                  <th className='py-1 pr-3'>Name</th>
                                  <th className='py-1 pr-3'>Desc</th>
                                  <th className='py-1 pr-3'>Qty (g)</th>
                                  <th className='py-1 pr-3'>Cal</th>
                                  <th className='py-1 pr-3'>Protein</th>
                                  <th className='py-1 pr-3'>Carbs</th>
                                  <th className='py-1 pr-3'>Fat</th>
                                  <th className='py-1 pr-3'>Fiber</th>
                                  <th className='py-1 pr-3'>Sodium</th>
                                  <th className='py-1 pr-3'>Sugar</th>
                                </tr>
                              </thead>
                              <tbody>
                                {m.items.map((it, ii) => (
                                  <tr key={ii} className='border-t'>
                                    <td className='py-1 pr-3'>{it.name}</td>
                                    <td className='py-1 pr-3'>{it.description || '—'}</td>
                                    <td className='py-1 pr-3'>{it.quantity ?? '—'}</td>
                                    <td className='py-1 pr-3'>{it.calories}</td>
                                    <td className='py-1 pr-3'>{it.protein}</td>
                                    <td className='py-1 pr-3'>{it.carbs}</td>
                                    <td className='py-1 pr-3'>{it.fat}</td>
                                    <td className='py-1 pr-3'>{it.fiber}</td>
                                    <td className='py-1 pr-3'>{it.sodium}</td>
                                    <td className='py-1 pr-3'>{it.sugar}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Supplements */}
                      {m.supplements?.length > 0 && (
                        <div className='mt-3'>
                          <div className='text-sm font-medium text-slate-700 mb-1 flex items-center gap-1'>
                            <Pill size={16} className='text-blue-600' /> Supplements
                          </div>
                          <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                            {m.supplements.map((s, si) => (
                              <div key={si} className='text-sm rounded border p-2 bg-slate-50'>
                                <div className='font-medium'>
                                  {capitalize(s.kind)}: {s.name}
                                </div>
                                <div className='text-slate-600'>Timing: {capitalize(s.timing)}</div>
                                <div className='text-slate-600'>Best with: {s.bestWith || '—'}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div>
        <div className='text-sm font-medium text-slate-800 mb-1'>Assigned Clients</div>
        {loadingAssignments ? (
          <div className='text-slate-500 text-sm'>Loading assignments...</div>
        ) : (assignments || []).length === 0 ? (
          <div className='text-slate-500 text-sm'>No assignments yet.</div>
        ) : (
          <ul className='list-disc pl-5 text-sm text-slate-700'>
            {assignments.map(a => (
              <li key={a.id}>{a.user?.name || a.user?.email || `User #${a.userId}`}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------
// MealItems Block
// ---------------------------
function MealItemsBlock({ control, basePath, errors }) {
  const { fields, append, remove } = useFieldArray({ control, name: basePath });

  return (
    <div className='mt-3'>
      <div className='flex items-center justify-between'>
        <div className='text-sm font-medium text-slate-700'>Food Items</div>
        <Button name='Add Item' icon={<Plus size={14} />} onClick={() => append(blankItem())} color='outline' className='text-xs' />
      </div>

      <div className='mt-2 space-y-3'>
        {fields.map((f, idx) => (
          <div key={f.id || idx} className='rounded-lg bg-white border p-3'>
            <div className='flex items-center justify-between mb-2'>
              <div className='text-sm font-medium text-slate-700'>Item {idx + 1}</div>
              <button type='button' onClick={() => remove(idx)} className='text-red-600 hover:text-red-700'>
                <X size={16} />
              </button>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              <Controller name={`${basePath}.${idx}.name`} control={control} render={({ field }) => <Input label='Name' value={field.value} onChange={field.onChange} required error={getErr(errors, `${basePath}.${idx}.name`)} />} />
              <Controller name={`${basePath}.${idx}.description`} control={control} render={({ field }) => <Input label='Description' value={field.value || ''} onChange={field.onChange} error={getErr(errors, `${basePath}.${idx}.description`)} />} />
              <Controller name={`${basePath}.${idx}.quantity`} control={control} render={({ field }) => <Input label='Quantity (g)' type='number' value={field.value ?? 0} onChange={v => field.onChange(asNumber(v))} error={getErr(errors, `${basePath}.${idx}.quantity`)} />} />
            </div>

            <div className='grid grid-cols-2 md:grid-cols-5 gap-3 mt-3'>
              {['calories', 'protein', 'carbs', 'fat', 'fiber', 'sodium', 'sugar'].map(k => (
                <Controller key={k} name={`${basePath}.${idx}.${k}`} control={control} render={({ field }) => <Input label={labelFor(k)} type='number' value={field.value ?? 0} onChange={v => field.onChange(asNumber(v))} required error={getErr(errors, `${basePath}.${idx}.${k}`)} />} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------
// Supplements Block
// ---------------------------
function SupplementsBlock({ control, basePath, errors }) {
  const { fields, append, remove } = useFieldArray({ control, name: basePath });

  return (
    <div className='mt-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2 text-sm font-medium text-slate-700'>
          <Pill size={16} className='text-blue-600' />
          Vitamins / Minerals / Other
        </div>
        <Button name='Add Supplement' icon={<Plus size={14} />} onClick={() => append({ kind: 'vitamin', name: '', timing: 'before', bestWith: '' })} color='outline' className='text-xs' />
      </div>

      {fields.length > 0 && (
        <div className='mt-2 space-y-3'>
          {fields.map((f, idx) => (
            <div key={f.id || idx} className='rounded-lg bg-white border p-3'>
              <div className='flex items-center justify-between mb-2'>
                <div className='text-sm font-medium text-slate-700'>Supplement {idx + 1}</div>
                <button type='button' onClick={() => remove(idx)} className='text-red-600 hover:text-red-700'>
                  <X size={16} />
                </button>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
                <Controller
                  name={`${basePath}.${idx}.kind`}
                  control={control}
                  render={({ field }) => (
                    <Select
                      label='Type'
                      options={[
                        { id: 'vitamin', label: 'Vitamin' },
                        { id: 'mineral', label: 'Mineral' },
                        { id: 'other', label: 'Other' },
                      ]}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Controller name={`${basePath}.${idx}.name`} control={control} render={({ field }) => <Input label='Name' value={field.value} onChange={field.onChange} required error={getErr(errors, `${basePath}.${idx}.name`)} />} />
                <Controller
                  name={`${basePath}.${idx}.timing`}
                  control={control}
                  render={({ field }) => (
                    <Select
                      label='Timing'
                      options={[
                        { id: 'before', label: 'Before Meal' },
                        { id: 'after', label: 'After Meal' },
                        { id: 'with', label: 'With Meal' },
                      ]}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Controller name={`${basePath}.${idx}.bestWith`} control={control} render={({ field }) => <Input label='Best Taken With' value={field.value || ''} onChange={field.onChange} placeholder='e.g., Water, Food' />} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------
// Day Overrides (optional)
// ---------------------------
function DayOverrides({ control, errors }) {
  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];

  return (
    <div className='space-y-3'>
      <h4 className='font-medium text-slate-800'>Customize Days (optional)</h4>
      <p className='text-xs text-slate-500'>If you leave a day empty, it will inherit the Base Day meals automatically.</p>

      <div className='space-y-3'>
        {days.map(d => (
          <DayOverrideBlock key={d.key} control={control} basePath={`dayOverrides.${d.key}`} label={d.label} errors={errors} />
        ))}
      </div>
    </div>
  );
}

function DayOverrideBlock({ control, basePath, label, errors }) {
  const { fields, append, remove } = useFieldArray({ control, name: basePath });
  const [open, setOpen] = useState(false);

  return (
    <div className='border rounded-lg'>
      <button type='button' onClick={() => setOpen(o => !o)} className='w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50'>
        <div className='flex items-center gap-2'>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className='font-medium text-slate-800'>{label}</span>
        </div>
        <span className='text-xs text-slate-500'>{fields.length} custom meals</span>
      </button>

      {open && (
        <div className='p-3 space-y-3 bg-slate-50/60'>
          <div className='flex items-center justify-end'>
            <Button name='Add Meal' icon={<Plus size={14} />} onClick={() => append({ title: `Meal ${fields.length + 1}`, time: '', items: [blankItem()], supplements: [] })} color='outline' className='text-xs' />
          </div>

          {fields.map((m, mi) => (
            <div key={m.id || mi} className='rounded-lg bg-white border p-3'>
              <div className='flex items-center justify-between mb-2'>
                <div className='text-sm font-medium text-slate-700'>Meal {mi + 1}</div>
                <button type='button' onClick={() => remove(mi)} className='text-red-600 hover:text-red-700'>
                  <X size={16} />
                </button>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                <Controller name={`${basePath}.${mi}.title`} control={control} render={({ field }) => <Input label='Meal Title' value={field.value} onChange={field.onChange} required error={getErr(errors, `${basePath}.${mi}.title`)} />} />
                <Controller name={`${basePath}.${mi}.time`} control={control} render={({ field }) => <Input label='Time (optional)' value={field.value || ''} onChange={field.onChange} />} />
              </div>

              <MealItemsBlock control={control} basePath={`${basePath}.${mi}.items`} errors={errors} />
              <SupplementsBlock control={control} basePath={`${basePath}.${mi}.supplements`} errors={errors} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------
// Confirm Dialog
// ---------------------------
function ConfirmDialog({ loading, open, onClose, title, message, confirmText, onConfirm }) {
  if (!open) return null;
  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg p-6 max-w-md w-full mx-4'>
        <h3 className='text-lg font-semibold text-slate-800 mb-2'>{title}</h3>
        <p className='text-slate-600 mb-4'>{message}</p>
        <div className='flex items-center justify-end gap-2'>
          <button onClick={onClose} disabled={loading} className='px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50'>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className='px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50'>
            {loading ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------
// Helpers
// ---------------------------
function blankItem() {
  return {
    name: '',
    description: '',
    quantity: 0, // grams
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sodium: 0,
    sugar: 0,
  };
}

function labelFor(k) {
  const map = {
    calories: 'Calories',
    protein: 'Protein (g)',
    carbs: 'Carbs (g)',
    fat: 'Fat (g)',
    fiber: 'Fiber (g)',
    sodium: 'Sodium (mg)',
    sugar: 'Sugar (g)',
  };
  return map[k] || k;
}

function asNumber(v) {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Normalize from old {foods:[]} to new meals shape
function mapFoodsToMeals(foods = []) {
  if (!foods?.length) return [];
  return [
    {
      title: 'Meal',
      time: '',
      items: foods.map(f => ({
        name: f.name,
        description: f.description,
        quantity: f.quantity ?? 0,
        calories: f.calories ?? 0,
        protein: f.protein ?? 0,
        carbs: f.carbs ?? 0,
        fat: f.fat ?? 0,
        fiber: f.fiber ?? 0,
        sodium: f.sodium ?? 0,
        sugar: f.sugar ?? 0,
      })),
      supplements:
        foods[0]?.vitamin || foods[0]?.mineral
          ? [
              {
                kind: foods[0]?.vitamin ? 'vitamin' : 'mineral',
                name: foods[0]?.vitamin || foods[0]?.mineral,
                timing: foods[0]?.timing || 'before',
                bestWith: foods[0]?.bestWith || '',
              },
            ]
          : [],
    },
  ];
}

// Convert form meals to server meals (each meal contains items + supplements)
// If your backend expects a different shape, adapt here.
function mealsToServerMeals(formMeals = []) {
  return formMeals.map(m => ({
    title: m.title,
    time: m.time || null,
    items: (m.items || []).map(it => ({
      name: it.name,
      description: it.description || '',
      quantity: it.quantity ?? 0, // grams
      calories: it.calories ?? 0,
      protein: it.protein ?? 0,
      carbs: it.carbs ?? 0,
      fat: it.fat ?? 0,
      fiber: it.fiber ?? 0,
      sodium: it.sodium ?? 0,
      sugar: it.sugar ?? 0,
    })),
    supplements: (m.supplements || []).map(s => ({
      kind: s.kind,
      name: s.name,
      timing: s.timing,
      bestWith: s.bestWith || '',
    })),
  }));
}

function getErr(errors, path) {
  // safe getter for nested error messages
  try {
    const segs = path.split('.');
    let cur = errors;
    for (const s of segs) cur = cur?.[s];
    return typeof cur?.message === 'string' ? cur.message : undefined;
  } catch {
    return undefined;
  }
}
