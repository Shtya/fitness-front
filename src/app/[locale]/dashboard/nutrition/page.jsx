/**
 * Fixes included:
 * 1) Show HH:MM validation errors directly under each time input (meals & supplements).
 * 2) Prevent notes list from disappearing after AI generate (always render at least one line).
 * 3) Safer Yup transforms for optional time fields.
 * 4) When setting notes from AI, never store an empty array.
 */

'use client';

import React, { useCallback, useEffect, useMemo, useState, memo, useRef, forwardRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { GripVertical, Plus, X, PencilLine, Calendar, Target, TrendingUp, Eye, Users as UsersIcon, Pill, Clock, ChevronDown, ChevronRight, ChefHat, UtensilsCrossed, Sparkles, Search, Check, CheckCircle } from 'lucide-react';

import { useForm, Controller, useFieldArray } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

import api from '@/utils/axios';
import { useUser } from '@/hooks/useUser';
import { useTranslations } from 'next-intl';
import { Modal, StatCard } from '@/components/dashboard/ui/UI';
import { Notification } from '@/config/Notification';
import Select from '@/components/atoms/Select';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import { useValues } from '@/context/GlobalContext';

export const Input = forwardRef(({ label, name, value, onChange, type = 'text', required = false, disabled = false, error, className = '', ...props }, ref) => {
  const base = 'peer w-full h-[35px] rounded-lg border bg-white/90 px-2 pt-1 text-sm outline-none placeholder-transparent transition ';
  const ok = 'border-slate-200 hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-200/40';
  const bad = 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200';

  return (
    <div className={`relative ${className}`}>
      <input ref={ref} id={name} name={name} type={type} value={value ?? ''} onChange={e => onChange?.(e.target?.value ?? e)} required={required} disabled={disabled} placeholder=' ' className={`${base} ${error ? bad : ok} disabled:opacity-60`} aria-invalid={!!error} aria-describedby={error ? `${name}-error` : undefined} {...props} />

      <label htmlFor={name} className={['rounded-[8px_8px_0_0] absolute pointer-events-none left-2 z-10 px-2 text-slate-500', 'transition-all duration-150 ease-out', 'peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[12px]', 'peer-focus:bg-white peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px]', 'peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:-translate-y-1/2 peer-[&:not(:placeholder-shown)]:text-[11px]', error ? 'text-rose-600' : ''].join(' ')}>
        {label}
        {required && <span className='ml-0.5 text-rose-500'>*</span>}
      </label>

      {error && (
        <p id={`${name}-error`} className='mt-1 text-xs text-rose-600'>
          {error}
        </p>
      )}
    </div>
  );
});
Input.displayName = 'Input';

/* =========================
   Clickable HH:MM Picker
   ========================= */
function pad(n) {
  return String(n).padStart(2, '0');
}

const hhmmRegex = /^$|^([01]\d|2[0-3]):([0-5]\d)$/; // "" or HH:MM

export function TimeField({ label = 'Time (HH:MM)', name, value, onChange, className = '', error }) {
  const [open, setOpen] = useState(false);
  const [tempH, setTempH] = useState('08');
  const [tempM, setTempM] = useState('00');
  const rootRef = useRef(null);

  useEffect(() => {
    const v = (value || '').trim();
    const ok = hhmmRegex.test(v);
    if (ok && v) {
      const [h, m] = v.split(':');
      setTempH(pad(Number(h)));
      setTempM(pad(Number(m)));
    }
  }, [value]);

  useEffect(() => {
    const onDoc = e => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const commit = (h = tempH, m = tempM) => {
    const val = `${pad(Number(h))}:${pad(Number(m))}`;
    onChange?.(val);
    setOpen(false);
  };

  const onManual = v => {
    onChange?.(v);
  };

  const hours = Array.from({ length: 24 }, (_, i) => pad(i));
  const minutes = Array.from({ length: 12 }, (_, i) => pad(i * 5)); // 00,05,10,...

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <Input label={label} name={name || 'time'} value={value || ''} onChange={onManual} placeholder=' ' className='cursor-pointer' onFocus={() => setOpen(true)} onClick={() => setOpen(true)} error={error} />

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className='absolute z-50 mt-1 w-[340px] rounded-lg border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-sm'>
            <div className='text-[12px] mb-2 text-slate-500'>Choose hour & minutes</div>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <div className='text-xs mb-1 text-slate-600'>Hour</div>
                <div className='grid grid-cols-6 gap-1 max-h-36 overflow-auto pr-1'>
                  {hours.map(h => (
                    <button
                      key={h}
                      type='button'
                      onClick={() => {
                        setTempH(h);
                        commit(h, tempM);
                      }}
                      className={['h-[25px] rounded-lg border text-xs', h === tempH ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50 text-slate-700'].join(' ')}>
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className='text-xs mb-1 text-slate-600'>Minutes</div>
                <div className='grid grid-cols-6 gap-1 max-h-36 overflow-auto pr-1'>
                  {minutes.map(m => (
                    <button
                      key={m}
                      type='button'
                      onClick={() => {
                        setTempM(m);
                        commit(tempH, m);
                      }}
                      className={['h-[25px] rounded-lg border text-xs', m === tempM ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50 text-slate-700'].join(' ')}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className='mt-3 flex items-center justify-between text-xs text-slate-500'>
              <div>
                Selected: <span className='font-medium text-slate-700'>{value && hhmmRegex.test(value) ? value : `${tempH}:${tempM}`}</span>
              </div>
              <button type='button' onClick={() => setOpen(false)} className='rounded-md border px-2.5 py-1 hover:bg-slate-50'>
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



/* =========================
   Buttons / Bits
   ========================= */
export function CButton({ name, icon, className = '', type = 'button', onClick, disabled = false, loading = false, variant = 'primary', size = 'md', title }) {
  const variantMap = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-300/40',
    outline: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:ring-slate-300/40',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-300/40',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-300/40',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-300/40',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-300/40',
    neutral: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-300/40',
  };

  const sizeMap = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-11 px-4 text-sm',
    lg: 'h-12 px-5 text-base',
  };

  return (
    <button type={type} title={title || name} disabled={disabled || loading} onClick={onClick} className={['inline-flex items-center gap-2 rounded-lg shadow-sm transition-all focus-visible:outline-none active:scale-[.99]', variantMap[variant] || variantMap.primary, sizeMap[size] || sizeMap.md, disabled || loading ? 'opacity-60 cursor-not-allowed' : '', className].join(' ')}>
      {loading && (
        <svg className='h-4 w-4 animate-spin' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
          <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
          <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z'></path>
        </svg>
      )}
      {icon}
      {name}
    </button>
  );
}

function CheckBox({ id = 'custom', label, initialChecked = false, onChange = () => {}, className = '' }) {
  const [checked, setChecked] = useState(!!initialChecked);

  useEffect(() => {
    setChecked(!!initialChecked);
  }, [initialChecked]);

  const toggle = () => {
    const next = !checked;
    setChecked(next);
    onChange(next);
  };

  const onKeyDown = e => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <button
        id={id}
        type='button'
        role='checkbox'
        aria-checked={checked}
        onClick={toggle}
        onKeyDown={onKeyDown}
        className={`relative cursor-pointer flex h-7 w-7 items-center justify-center rounded-md border transition-colors duration-300
          ${checked ? 'bg-gradient-to-br from-blue-600 to-indigo-600 border-blue-600' : 'bg-white border-gray-300'}
          focus:outline-none focus:ring-2 focus:ring-blue-400`}>
        <motion.div initial={false} animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
          <Check className='h-4 w-4 text-white' />
        </motion.div>
      </button>

      {label && (
        <span className='text-slate-800 text-[15px] leading-none cursor-pointer' onClick={toggle}>
          {label}
        </span>
      )}
    </div>
  );
}

/* =========================
   Schemas (items trimmed)
   ========================= */
const mealItemSchema = yup.object().shape({
  name: yup.string().trim().required('Required'),
  quantity: yup.number().typeError('Number').min(0).nullable(),
  calories: yup.number().typeError('Number').min(0).required('Required'),
});

const supplementSchema = yup.object().shape({
  name: yup.string().trim().required('Required'),
  time: yup
    .string()
    .transform(v => (v == null ? '' : v))
    .matches(hhmmRegex, 'HH:MM')
    .nullable(),
  timing: yup.string().trim().nullable(),
  bestWith: yup.string().trim().nullable(),
});

const mealSchema = yup.object().shape({
  title: yup.string().trim().required('Required'),
  time: yup
    .string()
    .transform(v => (v == null ? '' : v))
    .matches(hhmmRegex, 'HH:MM')
    .nullable(),
  items: yup.array().of(mealItemSchema).min(1, 'Add at least one item'),
  supplements: yup.array().of(supplementSchema),
});

const baseFormSchema = yup.object().shape({
  name: yup.string().trim().required('Plan name is required'),
  description: yup.string().trim().nullable(),
  notes: yup.string().trim().nullable(),
  notesList: yup.array().of(yup.string().trim()).default([]),
  baseMeals: yup.array().of(mealSchema).min(1, 'Add at least one meal'),
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

const DEFAULT_NOTES = ''.split('\n').filter(Boolean);

/* =========================
   Main Page
   ========================= */
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

  // Search/sort/pagination controls
  const [searchText, setSearchText] = useState('');
  const [perPage, setPerPage] = useState(12);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');

  const toggleSort = key => {
    if (sortBy !== key) {
      setSortBy(key);
      setSortOrder('DESC');
    } else {
      setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
    }
  };

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
      // controller expects "search" param (not q)
      const { data } = await api.get('/nutrition/meal-plans', {
        params: {
          search: searchText || undefined,
          sortBy,
          sortOrder,
          limit: perPage,
        },
      });
      setPlans(data.records || []);
    } catch (e) {
      setPlans([]);
    } finally {
      setListLoading(false);
    }
  }, [searchText, sortBy, sortOrder, perPage]);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchStats(), fetchPlans()]);
    })();
  }, [fetchStats, fetchPlans]);

  const fetchAssignments = useCallback(async planId => {
    try {
      const { data } = await api.get(`/nutrition/meal-plans/${planId}/assignments`);
      return data || [];
    } catch (e) {
      return [];
    }
  }, []);

  const onViewDetails = async plan => {
    setSelectedPlan(plan);
    setDetailsOpen(true);
    const a = await fetchAssignments(plan.id);
    setSelectedPlan(p => ({ ...(p || plan), __assignments: a }));
  };

  const onCreate = async payload => {
    try {
      await api.post('/nutrition/meal-plans', payload);
      Notification('Meal plan created successfully', 'success');
      setAddPlanOpen(false);
      await fetchPlans();
    } catch (e) {
      Notification(e?.response?.data?.message || 'Create failed', 'error');
    }
  };

  const onUpdate = async (planId, payload) => {
    try {
      await api.put(`/nutrition/meal-plans/${planId}`, payload);
      Notification('Meal plan updated successfully', 'success');
      setEditPlan(null);
      await fetchPlans();
    } catch (e) {
      Notification(e?.response?.data?.message || 'Update failed', 'error');
    }
  };

  const onAssign = async (planId, userId, setSubmitting) => {
    try {
      await api.post(`/nutrition/meal-plans/${planId}/assign`, { userId });
      Notification('Meal plan assigned successfully', 'success');
      setAssignPlanOpen(null);
      await fetchPlans();
      if (selectedPlan?.id === planId) {
        const a = await fetchAssignments(planId);
        setSelectedPlan(p => ({ ...(p || {}), __assignments: a }));
      }
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
        <StatCard icon={UsersIcon} title='Assignments' value={stats?.totals?.totalAssignments} />
      </GradientStatsHeader>

      {/* ---- Search / Sort / Per page ---- */}
      <div className='relative'>
        <div className='flex items-center justify-between gap-2 flex-wrap'>
          <div className='relative flex-1 max-w-[260px]'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
            <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder='Search plans…' className={['h-11 w-full pl-10 pr-10 rounded-lg', 'border border-slate-200 bg-white/90 text-slate-900', 'shadow-sm hover:shadow transition', 'focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200/40'].join(' ')} />
            {!!searchText && (
              <button type='button' onClick={() => setSearchText('')} className='absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100' aria-label='Clear search' title='Clear'>
                <X className='w-4 h-4' />
              </button>
            )}
          </div>

          <div className='flex items-center gap-2'>
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

            <CButton onClick={() => toggleSort('created_at')} icon={<Clock size={18} />} name={sortBy === 'created_at' ? (sortOrder === 'ASC' ? 'Oldest First' : 'Newest First') : 'Sort by Date'} variant='neutral' />
          </div>
        </div>
      </div>

      <PlanListView
        loading={listLoading}
        plans={plans}
        onPreview={onViewDetails}
        onEdit={setEditPlan}
        onAssign={setAssignPlanOpen}
        onDelete={id => {
          setDeletePlanId(id);
          setDeleteOpen(true);
        }}
      />

      {/* Create (enhanced popup visuals via inner container styles) */}
      <Modal open={addPlanOpen} maxHBody='!h-[90%]' maxH='h-[90vh] ' cn='!py-0' onClose={() => setAddPlanOpen(false)} title='Create Meal Plan'>
        <MealPlanForm onSubmitPayload={onCreate} submitLabel='Create Plan' />
      </Modal>

      {/* Edit */}
      <Modal open={!!editPlan} onClose={() => setEditPlan(null)} title={editPlan ? `Edit: ${editPlan.name}` : ''}>
        <div className='rounded-lg bg-gradient-to-b from-indigo-50/70 to-white p-3 sm:p-4'>{editPlan && <MealPlanForm initialPlan={editPlan} onSubmitPayload={(payload /*, setSubmitting*/) => onUpdate(editPlan.id, payload)} submitLabel='Update Plan' />}</div>
      </Modal>

      {/* Assign */}
      <Modal open={!!assignPlanOpen} onClose={() => setAssignPlanOpen(null)} title={assignPlanOpen ? `Assign: ${assignPlanOpen.name}` : ''}>
        <div className='rounded-lg bg-gradient-to-b from-blue-50/60 to-white p-3 sm:p-4'>{assignPlanOpen && <AssignPlanForm plan={assignPlanOpen} clients={optionsClient} onAssign={(userId, setSubmitting) => onAssign(assignPlanOpen.id, userId, setSubmitting)} />}</div>
      </Modal>

      {/* Details */}
      <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)} title={selectedPlan ? `Meal Plan Details: ${selectedPlan.name}` : 'Meal Plan Details'}>
        <div className='rounded-lg bg-gradient-to-b from-slate-50/60 to-white p-3 sm:p-4'>{selectedPlan && <PlanDetailsView plan={selectedPlan} />}</div>
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

/* =========================
   Meal Plan Form
   ========================= */
export function ReorderFieldArray({ control, name, renderRow, className = 'space-y-2' }) {
  const { fields, replace } = useFieldArray({ control, name });
  if (!fields?.length) return null;

  return (
    <Reorder.Group axis='y' values={fields} onReorder={newOrder => replace(newOrder)} className={className}>
      {fields.map((row, idx) => (
        <Reorder.Item key={row.id || idx} value={row} dragListener className='rounded-lg border border-slate-200 bg-white p-2'>
          <div className='flex items-start gap-2'>
            <GripVertical className='w-4 h-4 mt-2 shrink-0 cursor-grab text-slate-400' />
            <div className='flex-1'>{renderRow({ row, index: idx })}</div>
          </div>
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
}

// ✅ MealPlanForm with AI hookup + DTO-aligned submit payload
export function MealPlanForm({ initialPlan, onSubmitPayload, submitLabel = 'Save' }) {
  const defaultMeals = [{ title: 'Meal 1', time: '', items: [blankItem()], supplements: [] }];

  const initialFormValues = useMemo(() => {
    if (!initialPlan) {
      return {
        name: '',
        description: '',
        notes: (DEFAULT_NOTES || []).join('\n'),
        notesList: DEFAULT_NOTES.length ? DEFAULT_NOTES : [''],
        baseMeals: defaultMeals,
        customizeDays: false,
        dayOverrides: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
      };
    }

    const firstDayMeals = (initialPlan.days?.[0]?.meals?.length ? initialPlan.days[0].meals : mapFoodsToMeals(initialPlan.days?.[0]?.foods)) || defaultMeals;

    const existingNotes = String(initialPlan.notes || '')
      .split('\n')
      .filter(Boolean);

    return {
      name: initialPlan.name || '',
      description: initialPlan.desc || '',
      notes: initialPlan.notes || '',
      notesList: existingNotes.length ? existingNotes : [''],
      baseMeals: cloneMealsStrict(firstDayMeals),
      customizeDays: false,
      dayOverrides: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
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

  const {
    fields: baseMeals,
    append: appendMeal,
    remove: removeMeal,
    replace: replaceMeals,
  } = useFieldArray({
    control,
    name: 'baseMeals',
  });

  // AI Assist state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState('Create a 2300 calorie recomposition meal plan with 5 meals per day. Include a multivitamin after Meal 1 and omega-3 after Meal 2.');
  const [aiLoading, setAiLoading] = useState(false);

  // ---- Submit: send DTO expected by backend (CreateMealPlanDto)
  const onSubmit = async data => {
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const baseMealsPayload = mealsToServerMealsStrict(data.baseMeals);

    // Build dayOverrides object keyed by DayOfWeek enum values (lowercase)
    const dayOverrides = {};
    dayKeys.forEach(k => {
      const overrideMeals = data?.dayOverrides?.[k] || [];
      if (Array.isArray(overrideMeals) && overrideMeals.length > 0 && data.customizeDays) {
        dayOverrides[k] = {
          day: k,
          meals: mealsToServerMealsStrict(overrideMeals),
          supplements: [], // no day-level supplements UI; keep empty array
        };
      }
    });

    const payload = {
      name: data.name,
      description: data.description || '',
      notes: (data.notesList || []).filter(Boolean).join('\n'),
      baseMeals: baseMealsPayload,
      customizeDays: !!data.customizeDays,
      dayOverrides: Object.keys(dayOverrides).length ? dayOverrides : undefined,
    };

    await onSubmitPayload(payload);
  };

  // ===== AI integration (calls your backend /nutrition/ai/generate) =====
  function normalizeAiResponse(raw) {
    // already the final shape (object with meals/name)
    if (raw && typeof raw === 'object' && (raw.meals || raw.name)) {
      return raw;
    }
    // OpenRouter/OpenAI
    const maybeContent = raw?.content ?? raw?.choices?.[0]?.message?.content ?? raw;
    if (maybeContent && typeof maybeContent === 'object' && (maybeContent.meals || maybeContent.name)) {
      return maybeContent;
    }
    // String -> strip fences -> parse
    if (typeof maybeContent === 'string') {
      const text = safeJsonFromCodeFence(maybeContent.trim());
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {}
    }
    throw new Error('Unable to parse AI response.');
  }

  const runAiFill = async () => {
    if (!aiText?.trim()) return;
    setAiLoading(true);
    try {
      const prompt = buildAiPrompt(aiText);

      // 1) Call your backend (controller -> service -> OpenRouter)
      const { data } = await api.post('/nutrition/ai/generate', { prompt });

      // 2) Normalize/parse whatever shape we got
      const parsed = normalizeAiResponse(data);

      // 3) Build safe meals in your trimmed shape
      const safeMeals = (Array.isArray(parsed?.meals) ? parsed.meals : []).map(m => ({
        title: m?.title || 'Meal',
        time: m?.time || '',
        items: (m?.items || []).map(it => ({
          name: String(it?.name || '').trim(),
          quantity: it?.quantity === '' || it?.quantity === null || typeof it?.quantity === 'undefined' ? null : Number(it.quantity) || null,
          calories: Number(it?.calories) || 0,
        })),
        supplements: (m?.supplements || []).map(s => ({
          name: String(s?.name || '').trim(),
          time: s?.time ? String(s.time) : '',
          timing: s?.timing ? String(s.timing) : '',
          bestWith: s?.bestWith ? String(s.bestWith) : '',
        })),
      }));

      if (!safeMeals.length) throw new Error('AI returned no meals.');

      // 4) Fill the form
      setValue('baseMeals', safeMeals, { shouldValidate: true, shouldDirty: true });
      if (parsed?.name) setValue('name', String(parsed.name), { shouldDirty: true });
      if (parsed?.description) setValue('description', String(parsed.description), { shouldDirty: true });

      // notes can be string[] or string — never store empty array
      if (Array.isArray(parsed?.notes)) {
        const arr = parsed.notes.map(String).filter(Boolean);
        setValue('notesList', arr.length ? arr : [''], { shouldDirty: true });
      } else if (typeof parsed?.notes === 'string') {
        const lines = parsed.notes
          .split('\n')
          .map(s => s.trim())
          .filter(Boolean);
        setValue('notesList', lines.length ? lines : [''], { shouldDirty: true });
      }

      Notification('AI filled the plan. Review and adjust as needed.', 'success');
      setAiOpen(false);
      setAiText('');
    } catch (e) {
      Notification(e?.message || 'AI failed to generate data', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <form className='space-y-6 mt-2'>
      {/* Name / Desc */}
      <div className='grid grid-cols-2 max-md:grid-cols-1 gap-3'>
        <Controller name='name' control={control} render={({ field }) => <Input label='Plan Name' name='name' value={field.value} onChange={field.onChange} required error={errors?.name?.message} />} />
        <Controller name='description' control={control} render={({ field }) => <Input label='Description' name='description' value={field.value} onChange={field.onChange} error={errors?.description?.message} />} />
      </div>

      {/* Bullet Notes */}
      <Controller name='notesList' control={control} render={({ field }) => <NotesListInput value={Array.isArray(field.value) && field.value.length ? field.value : ['']} onChange={field.onChange} />} />

      {/* Base Day */}
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <h4 className='font-medium text-slate-800 flex items-center gap-2'>
            Base Day Meals (applies to all days)
            <Clock size={16} className='text-slate-500' />
          </h4>

          <div className='flex items-center gap-2'>
            <CButton
              name='Add Meal'
              size='sm'
              className='!bg-white'
              icon={<Plus size={14} />}
              onClick={() =>
                appendMeal({
                  title: `Meal ${baseMeals.length + 1}`,
                  time: '',
                  items: [blankItem()],
                  supplements: [],
                })
              }
              variant='outline'
            />
          </div>
        </div>

        {/* Drag & Drop for baseMeals using Reorder */}
        {baseMeals?.length ? (
          <Reorder.Group axis='y' values={baseMeals} onReorder={newOrder => replaceMeals(newOrder)} className='space-y-2'>
            {baseMeals.map((m, mealIndex) => (
              <Reorder.Item key={m.id || mealIndex} value={m} dragListener className='rounded-lg border border-slate-200 bg-white px-3 py-4 '>
                <div className='flex items-center justify-between gap-3 mb-2'>
                  <div className='flex items-center gap-2 text-slate-600 min-w-0'>
                    <GripVertical className='w-4 h-4 shrink-0 cursor-grab text-slate-400' />
                    <Controller name={`baseMeals.${mealIndex}.title`} control={control} render={({ field }) => <Input className='max-w-[300px]' label='Meal Name' value={field.value} onChange={field.onChange} required error={getErr(errors, `baseMeals.${mealIndex}.title`)} />} />
                    <Controller name={`baseMeals.${mealIndex}.time`} control={control} render={({ field }) => <TimeField className='w-[160px]' label='HH:MM' value={field.value || ''} onChange={field.onChange} error={getErr(errors, `baseMeals.${mealIndex}.time`)} />} />
                  </div>

                  <DangerX onClick={() => removeMeal(mealIndex)} title='Remove meal' />
                </div>

                <MealBlocks ctx={{ control, basePath: `baseMeals.${mealIndex}`, errors }} />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        ) : (
          <div className='rounded-lg border border-dashed border-slate-200 bg-white/70 py-6 text-center text-sm text-slate-500'>
            No meals. Click <span className='font-medium'>“Add Meal”</span> to start.
          </div>
        )}

        {errors?.baseMeals?.message && <p className='text-sm text-red-600'>{errors.baseMeals.message}</p>}
      </div>

      {/* Customize Days Toggle */}
      <Controller name='customizeDays' control={control} render={({ field }) => <CheckBox id='customizeDays' label='Customize specific days (optional)' initialChecked={!!field.value} onChange={field.onChange} />} />

      {customizeDays && <DayOverrides control={control} errors={errors} />}

      {/* AI Assist */}
      {aiOpen && (
        <div className='rounded-lg border border-indigo-200 bg-indigo-50/40 p-3 space-y-2'>
          <textarea rows={3} className='w-full bg-white rounded-lg border border-slate-200 p-3 focus:outline-none focus:ring-4 focus:ring-indigo-200/40' placeholder='e.g., 2300 kcal recomposition, 5 meals, add multivitamin after Meal 1, omega after Meal 2…' value={aiText} onChange={e => setAiText(e.target.value)} />
          <div className='flex items-center justify-end gap-2'>
            <CButton name='Generate' onClick={runAiFill} loading={aiLoading} variant='primary' />
          </div>
        </div>
      )}

      <div className='flex items-center justify-end gap-2 pt-2'>
        <div className='flex items-center gap-2'>
          <CButton type='button' onClick={() => setAiOpen(o => !o)} icon={<Sparkles size={16} />} name='AI Assist' variant='outline' />
        </div>

        <CButton onClick={handleSubmit(onSubmit)} name={submitLabel} type='submit' variant='primary' loading={isSubmitting} />
      </div>
    </form>
  );
}

function buildAiPrompt(userText) {
  // Ensures the model returns exactly what the UI expects (trimmed items shape)
  return `
Return ONLY valid JSON matching exactly:

{
  "name": "Plan Name",
  "description": "Short description",
  "notes": ["bullet 1", "bullet 2"],
  "meals": [
    {
      "title": "Meal 1",
      "time": "08:00",
      "items": [
        { "name": "Oats", "quantity": 80, "calories": 320 }
      ],
      "supplements": [
        { "name": "Multivitamin", "time": "08:30", "timing": "after Meal 1", "bestWith": "water" }
      ]
    }
  ]
}

Rules:
- Use 24h "HH:MM" for any time (or empty string).
- Items ONLY have: name (string), quantity (number or null), calories (number).
- Provide 3–6 meals unless the user clearly asks otherwise.
- Keep supplements fields to: name, time, timing, bestWith.
- Return VALID JSON without markdown fences.

User description:
${userText}
`;
}

function safeJsonFromCodeFence(s) {
  if (!s) return s;
  const m = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return m ? m[1] : s;
}

const asNumber = v => {
  const n = typeof v === 'string' ? v : '';
  if (n === '') return null;
  const num = Number(n);
  return Number.isFinite(num) ? num : null;
};

const MealBlocks = memo(function MealBlocks({ ctx }) {
  const { control, basePath, errors } = ctx;

  const { fields: itemFields, append: appendItem, remove: removeItem, move: moveItem } = useFieldArray({ control, name: `${basePath}.items` });
  const { fields: supFields, append: appendSup, remove: removeSup, move: moveSup } = useFieldArray({ control, name: `${basePath}.supplements` });

  const addItem = () => appendItem(blankItem());
  const addSup = () => appendSup(blankSupplement());

  return (
    <div className='mt-3 space-y-3'>
      {/* -------- Items -------- */}
      <div className='p-4 space-y-4'>
        {itemFields.map((f, idx) => (
          <DraggableCard key={f.id || idx} index={idx} onMove={(from, to) => moveItem(from, to)}>
            <div className='flex flex-col gap-2 rounded-lg'>
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2 text-slate-500'>
                  <div className='flex-none'>
                    <GripDots />
                  </div>
                  <div className='grid grid-cols-2 md:grid-cols-[1fr_150px_140px] gap-3'>
                    <Controller name={`${basePath}.items.${idx}.name`} control={control} render={({ field }) => <Input label='Item Name' value={field.value} onChange={field.onChange} required error={getErr(errors, `${basePath}.items.${idx}.name`)} />} />
                    <Controller name={`${basePath}.items.${idx}.quantity`} control={control} render={({ field }) => <Input label='Quantity (g)' type='number' value={field.value == null ? '' : field.value} onChange={v => field.onChange(asNumber(v))} error={getErr(errors, `${basePath}.items.${idx}.quantity`)} inputMode='decimal' />} />
                    <Controller name={`${basePath}.items.${idx}.calories`} control={control} render={({ field }) => <Input label='Calories' type='number' value={field.value == 0 ? null : field.value} onChange={v => field.onChange(asNumber(v))} required error={getErr(errors, `${basePath}.items.${idx}.calories`)} inputMode='decimal' />} />
                  </div>
                </div>
                <DangerX size='md' onClick={() => removeItem(idx)} title='Remove item' />
              </div>
            </div>
          </DraggableCard>
        ))}
      </div>

      {/* -------- Supplements (with Time) -------- */}
      <div className='space-y-4'>
        {supFields.map((f, idx) => (
          <DraggableCard key={f.id || idx} index={idx} onMove={(from, to) => moveSup(from, to)}>
            <div className='flex items-center gap-2 justify-between rounded-lg px-4'>
              <div className='flex items-center gap-2 text-slate-500 w-full'>
                <div className='flex-none'>
                  <GripDots />
                </div>
                <div className='grid grid-cols-1 md:grid-cols-4 gap-3 w-full'>
                  <Controller name={`${basePath}.supplements.${idx}.name`} control={control} render={({ field }) => <Input label='Supplement Name' value={field.value} onChange={field.onChange} error={getErr(errors, `${basePath}.supplements.${idx}.name`)} />} />
                  <Controller name={`${basePath}.supplements.${idx}.time`} control={control} render={({ field }) => <TimeField label='Time (HH:MM)' value={field.value || ''} onChange={field.onChange} error={getErr(errors, `${basePath}.supplements.${idx}.time`)} />} />
                  <Controller name={`${basePath}.supplements.${idx}.timing`} control={control} render={({ field }) => <Input label='Timing' value={field.value || ''} onChange={field.onChange} />} />
                  <Controller name={`${basePath}.supplements.${idx}.bestWith`} control={control} render={({ field }) => <Input label='Best with' value={field.value || ''} onChange={field.onChange} />} />
                </div>
              </div>
              <DangerX onClick={() => removeSup(idx)} title='Remove supplement' />
            </div>
          </DraggableCard>
        ))}
      </div>

      {/* -------- Bottom quick-add (both types) -------- */}
      <div className='border-t border-slate-200 pt-3 flex items-center justify-end gap-2'>
        <CButton name='Add Item' size='sm' className='!bg-white' icon={<Plus size={14} />} onClick={addItem} variant='outline' />
        <CButton name='Add Supplement' size='sm' className='!bg-white' icon={<Pill size={14} />} onClick={addSup} variant='outline' />
      </div>
    </div>
  );
});

function NotesListInput({ value = [''], onChange }) {
  const [refs, setRefs] = useState([]);

  const list = Array.isArray(value) && value.length ? value : [''];

  useEffect(() => {
    setRefs(arr => arr.slice(0, list.length));
  }, [list.length]);

  const addAfter = i => {
    const next = [...list];
    next.splice(i + 1, 0, '');
    onChange(next);
    requestAnimationFrame(() => refs[i + 1]?.focus());
  };

  const removeAt = i => {
    const next = [...list];
    next.splice(i, 1);
    onChange(next.length ? next : ['']);
    requestAnimationFrame(() => refs[Math.max(0, i - 1)]?.focus());
  };

  return (
    <div className='rounded-lg border border-slate-200 bg-white px-2 py-2 '>
      <ul className='space-y-2'>
        {list.map((line, i) => (
          <li key={i} className='flex items-center gap-2'>
            <CheckCircle className='h-4 w-4 text-emerald-500 flex-shrink-0' />
            <input
              ref={el => (refs[i] = el)}
              className='flex-1    text-sm outline-none hover:border-slate-400 focus:border-emerald-500 transition'
              value={line}
              onChange={e => {
                const next = [...list];
                next[i] = e.target.value;
                onChange(next);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addAfter(i);
                }
                if (e.key === 'Backspace' && !line) {
                  e.preventDefault();
                  removeAt(i);
                }
              }}
              placeholder='Type a note and press Enter…'
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

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

  // Lifted open state so it doesn't collapse when adding meals
  const [openDays, setOpenDays] = useState({});
  const toggle = key => setOpenDays(s => ({ ...s, [key]: !s[key] }));
  const ensureOpen = key => setOpenDays(s => ({ ...s, [key]: true }));

  function DayOverrideBlock({ control, basePath, label, errors, dayKey, isOpen, onToggle, onEnsureOpen }) {
    const { fields, append, remove, move } = useFieldArray({ control, name: basePath });

    return (
      <div className='border border-slate-200 bg-white rounded-lg overflow-hidden'>
        <button type='button' onClick={() => onToggle(dayKey)} className='w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50'>
          <div className='flex items-center gap-2'>
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span className='font-medium text-slate-800'>{label}</span>
          </div>
          <span className='text-xs text-slate-500'>{fields.length} custom meals</span>
        </button>

        {isOpen && (
          <div className='p-3 space-y-3 bg-slate-50/60'>
            <div className='flex items-center justify-between'>
              <div />
              <CButton
                name='Add Meal'
                icon={<Plus size={14} />}
                onClick={e => {
                  e.stopPropagation();
                  append({ title: `Meal ${fields.length + 1}`, time: '', items: [blankItem()], supplements: [] });
                  onEnsureOpen(dayKey);
                }}
                variant='outline'
                size='sm'
              />
            </div>

            <div className='space-y-2'>
              {fields.map((m, mi) => (
                <DraggableCard key={m.id || mi} index={mi} onMove={(from, to) => move(from, to)}>
                  <div className='rounded-lg bg-white border p-3'>
                    <div className='flex items-center justify-between mb-2'>
                      <div className='flex items-center gap-2 text-slate-500'>
                        <GripDots />
                        <div className='text-sm font-medium text-slate-700'>Meal {mi + 1}</div>
                      </div>
                      <DangerX onClick={() => remove(mi)} title='Remove meal' />
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                      <Controller name={`${basePath}.${mi}.title`} control={control} render={({ field }) => <Input label='Meal Title' value={field.value} onChange={field.onChange} required error={getErr(errors, `${basePath}.${mi}.title`)} />} />
                      <Controller name={`${basePath}.${mi}.time`} control={control} render={({ field }) => <TimeField label='Time (HH:MM)' value={field.value || ''} onChange={field.onChange} error={getErr(errors, `${basePath}.${mi}.time`)} />} />
                    </div>

                    <MealBlocks ctx={{ control, basePath: `${basePath}.${mi}`, errors }} />
                  </div>
                </DraggableCard>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <h4 className='font-medium text-slate-800'>Customize Days (optional)</h4>
      <p className='text-xs text-slate-500'>If you leave a day empty, it will inherit the Base Day meals automatically.</p>

      <div className='space-y-2'>
        {days.map(d => (
          <DayOverrideBlock key={d.key} control={control} basePath={`dayOverrides.${d.key}`} label={d.label} errors={errors} dayKey={d.key} isOpen={!!openDays[d.key]} onToggle={toggle} onEnsureOpen={ensureOpen} />
        ))}
      </div>
    </div>
  );
}

/* =========================
   Details View (clean UI + tiny graphs)
   ========================= */

export function PlanDetailsView({ plan }) {
  const [open, setOpen] = useState({}); // expand/collapse per day
  const toggle = key => setOpen(p => ({ ...p, [key]: !p[key] }));
  const capitalize = s => (typeof s === 'string' ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const mapFoodsToMeals = (foods = []) => [{ title: 'Meal 1', items: foods }];

  const spring = { type: 'spring', stiffness: 300, damping: 30, mass: 0.7 };

  const sumCalories = meals => {
    let total = 0;
    (meals || []).forEach(m => (m.items || []).forEach(it => (total += Number(it.calories || 0))));
    return total;
  };

  // tiny bar width
  const mealWidthPct = (meal, max) => {
    const cals = (meal.items || []).reduce((a, b) => a + Number(b.calories || 0), 0);
    return Math.min(100, Math.round((cals / Math.max(1, max)) * 100));
  };

  return (
    <div className='space-y-4'>
      {!!plan?.desc && <div className='text-sm text-slate-700'>{plan.desc}</div>}

      {!!plan?.notes && (
        <div className='rounded-xl border border-amber-200 bg-amber-50 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.5)]'>
          <div className='mb-1 text-sm font-semibold text-amber-900'>Notes</div>
          <pre className='whitespace-pre-wrap text-[13px] leading-6 text-amber-900'>{plan.notes}</pre>
        </div>
      )}

      {/* Days */}
      <div className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'>
        {plan?.days?.map((d, idx) => {
          const dayKey = d.day || `day-${idx}`;
          const meals = d.meals || mapFoodsToMeals(d.foods || []);
          const isOpen = !!open[dayKey];
          const totals = sumCalories(meals);
          const maxMeal = Math.max(1, ...meals.map(m => (m.items || []).reduce((a, b) => a + Number(b.calories || 0), 0)));

          return (
            <div key={dayKey} className='border-b border-slate-200 last:border-b-0'>
              {/* Header Row */}
              <button type='button' onClick={() => toggle(dayKey)} className='group flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50'>
                <div className='flex items-center gap-2'>
                  <motion.span initial={false} animate={{ rotate: isOpen ? 180 : 0 }} transition={spring} className='inline-flex'>
                    <ChevronDown size={16} className='text-slate-600' />
                  </motion.span>
                  <span className='font-medium text-slate-800'>{capitalize(d.name || d.day || `Day ${idx + 1}`)}</span>
                </div>
                <div className='flex items-center gap-3 text-xs text-slate-600'>
                  <span className='rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 shadow-sm'>{meals.length} meals</span>
                  <span className='inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 shadow-sm'>
                    <ChefHat size={12} className='text-indigo-600' />
                    {`${totals} kcal`}
                  </span>
                </div>
              </button>

              {/* Animated Content */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div key='content' initial={{ height: 0, opacity: 0, y: -8 }} animate={{ height: 'auto', opacity: 1, y: 0 }} exit={{ height: 0, opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }} className='overflow-hidden'>
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.25 }} className='space-y-3 bg-slate-50/60 px-3 pb-3'>
                      {meals.map((m, mi) => {
                        const mealCals = (m.items || []).reduce((a, b) => a + Number(b.calories || 0), 0);
                        return (
                          <motion.div key={mi} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='rounded-xl border border-slate-200 bg-white p-3 shadow-sm'>
                            <div className='flex items-center justify-between'>
                              <div className='flex items-center gap-2 font-medium text-slate-800'>
                                <UtensilsCrossed size={16} className='text-indigo-600' />
                                {m.title || `Meal ${mi + 1}`}
																<div className='mt-1 text-[11px] text-slate-500'>~ {mealCals} kcal</div>
                              </div>
                              <div className='flex items-center gap-1 text-xs text-slate-500'>
                                <Clock size={14} /> {m.time || '—'}
                              </div>
                            </div>

                             <div className='mt-2'>
                              <div className='h-2 w-full overflow-hidden rounded-full bg-slate-100'>
                                <motion.div initial={{ width: 0 }} animate={{ width: `${mealWidthPct(m, maxMeal)}%` }} transition={spring} className='h-full rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500' />
                              </div>
                            </div>

                            {/* Items */}
                            {m.items?.length > 0 && (
                              <div className='mt-3'>
                                 <div className='overflow-x-auto'>
                                  <table className='w-full text-sm'>
                                    <thead>
                                      <tr className='text-left text-slate-500'>
                                        <th className='py-1 pr-3'>Name</th>
                                        <th className='py-1 pr-3'>Qty (g)</th>
                                        <th className='py-1 pr-3'>Calories</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {m.items.map((it, ii) => (
                                        <tr key={ii} className='border-t border-slate-200'>
                                          <td className='py-1 pr-3'>{it.name}</td>
                                          <td className='py-1 pr-3'>{it.quantity ?? '—'}</td>
                                          <td className='py-1 pr-3'>{it.calories}</td>
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
                                <div className='mb-1 flex items-center gap-1 text-sm font-medium text-slate-700'>
                                  <span className='inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200'>
                                    <Clock size={12} />
                                  </span>
                                  Supplements
                                </div>
                                <div className=' '>
                                  {m.supplements.map((s, si) => (
                                    <div key={si} className=' grid grid-cols-4 gap-2 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm'>
                                      <div className='font-medium text-slate-800'>{s.name}</div>
                                      <div className='text-slate-600'>Time: {s.time || '—'}</div>
                                      <div className='text-slate-600'>Timing: {s.timing || '—'}</div>
                                      <div className='text-slate-600'>Best with: {s.bestWith || '—'}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Assigned */}
      <div>
        <div className='mb-1 text-sm font-medium text-slate-800'>Assigned Clients</div>
        {!plan?.__assignments ? (
          <div className='text-sm text-slate-500'>—</div>
        ) : plan.__assignments.length === 0 ? (
          <div className='text-sm text-slate-500'>No assignments yet.</div>
        ) : (
          <ul className='list-disc pl-5 text-sm text-slate-700'>
            {plan.__assignments.map(a => (
              <li key={a.id}>{a.user?.name || a.user?.email || `User #${a.userId}`}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* =========================
   Assign Form
   ========================= */
function AssignPlanForm({ plan, clients, onAssign }) {
  const [userId, setUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const options = (clients || []).map(c => ({ id: c.id, label: c.name || c.email || `#${c.id}` }));

  const submit = async e => {
    e.preventDefault();
    if (!userId) return;
    setSubmitting(true);
    await onAssign(userId, setSubmitting);
    // setSubmitting(false) handled by parent in finally
  };

  return (
    <form onSubmit={submit} className='space-y-4'>
      <div>
        <h4 className='font-medium text-slate-800 mb-2'>Assign "{plan.name}" to:</h4>
        <Select options={options} value={userId} onChange={setUserId} placeholder='Select a client' />
      </div>
      <div className='flex items-center justify-end'>
        <CButton name='Assign Plan' type='submit' disabled={!userId} loading={submitting} variant='success' />
      </div>
    </form>
  );
}

/* =========================
   List View (Pretty UI)
   ========================= */
export const PlanListView = memo(function PlanListView({ loading, plans = [], onPreview, onEdit, onDelete, onAssign }) {
  if (loading) {
    return (
      <div className='divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className='group relative flex items-center gap-3 px-4 py-3'>
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

  if (!plans.length) {
    return (
      <div className='rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm'>
        <div className='mx-auto grid h-16 w-16 place-content-center rounded-lg bg-slate-100'>
          <UtensilsCrossed className='h-8 w-8 text-slate-500' />
        </div>
        <h3 className='mt-4 text-lg font-semibold text-slate-900'>No plans found</h3>
        <p className='mt-1 text-sm text-slate-600'>Try a different search or create a new plan.</p>
      </div>
    );
  }

  return (
    <div className='divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
      {plans.map(p => {
        const assignments = Array.isArray(p?.assignments) ? p.assignments : [];
        const totalAssignees = assignments.length;

        return (
          <div key={p.id} className='group relative flex items-start gap-3 px-4 py-3 transition-all duration-300 hover:bg-slate-50/60'>
            <span aria-hidden className='absolute left-0 top-0 h-full w-1 rounded-tr-lg rounded-br-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-70' />

            <div className='mt-0.5 grid h-12 w-12 shrink-0 place-content-center rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-95 text-white shadow-sm'>
              <UtensilsCrossed className='h-5 w-5' />
            </div>

            <div className='min-w-0 flex-1'>
              <div className='truncate text-sm font-semibold text-slate-900'>{p.name}</div>
              {p.desc || p.notes ? <p className='line-clamp-1 text-[13px] leading-5 text-slate-600'>{p.desc ?? p.notes}</p> : <p className='mt-1 text-[13px] text-slate-500'>No description.</p>}
            </div>

            <div className='ml-auto flex shrink-0 items-center gap-1'>
              <CButton type='button' onClick={() => onAssign?.(p)} className='px-3' icon={<UsersIcon className='h-4 w-4' />} name={`Assign${totalAssignees ? ` (${totalAssignees})` : ''}`} variant='outline' size='sm' />

              <div className='flex items-center gap-1'>
                <IconButton title='Preview' onClick={() => onPreview?.(p)} kind='neutral'>
                  <Eye className='h-4 w-4' />
                </IconButton>
                <IconButton title='Edit' onClick={() => onEdit?.(p)} kind='warning'>
                  <PencilLine className='h-4 w-4' />
                </IconButton>
                <IconButton title='Delete' onClick={() => onDelete?.(p.id)} kind='danger'>
                  <X className='h-4 w-4' />
                </IconButton>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

/* =========================
   UI bits
   ========================= */
function ConfirmDialog({ loading, open, onClose, title, message, confirmText, onConfirm }) {
  if (!open) return null;
  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg p-6 max-w-md w-full mx-4'>
        <h3 className='text-lg font-semibold text-slate-800 mb-2'>{title}</h3>
        <p className='text-slate-600 mb-4'>{message}</p>
        <div className='flex items-center justify-end gap-2'>
          <CButton onClick={onClose} disabled={loading} name='Cancel' variant='outline' />
          <CButton onClick={onConfirm} disabled={loading} name={loading ? 'Deleting…' : confirmText} variant='danger' />
        </div>
      </div>
    </div>
  );
}

function IconButton({ children, title, onClick, disabled, kind = 'neutral' }) {
  const color = kind === 'warning' ? 'border-amber-100 text-amber-700 hover:bg-amber-100 focus-visible:ring-amber-300/30' : kind === 'danger' ? 'border-rose-100 text-rose-600 hover:bg-rose-100 focus-visible:ring-rose-300/30' : kind === 'neutral' ? 'border-slate-200 text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-300/30' : 'border-blue-100 text-blue-600 hover:bg-blue-100 focus-visible:ring-blue-300/30';

  return (
    <button type='button' title={title} disabled={disabled} onClick={onClick} className={['inline-flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition-all focus-visible:outline-none', 'active:scale-[.98]', disabled ? 'opacity-50 cursor-not-allowed' : color].join(' ')}>
      {children}
    </button>
  );
}

export function DangerX({ onClick, title = 'Remove', size = 'md' }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 1200);
    return () => clearTimeout(t);
  }, [armed]);

  const handleClick = () => {
    if (armed) onClick?.();
    else setArmed(true);
  };

  const sizeStyles = {
    sm: 'px-1.5 py-1.5 text-xs',
    md: 'px-2.5 py-2 text-sm',
    lg: 'px-3 py-2.5 text-base',
  };

  const colorStyles = armed ? 'border-red-200 bg-red-50 text-red-700 animate-pulse' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';

  const buttonClass = ['inline-flex items-center justify-center rounded-lg border font-medium transition-all shadow-sm', 'focus:outline-none focus:ring-2 focus:ring-red-300', sizeStyles[size] || sizeStyles.md, colorStyles].join(' ');

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  return (
    <button type='button' onClick={handleClick} title={title} className={buttonClass}>
      <X size={iconSize} className={armed ? 'animate-pulse' : ''} />
      <span className='hidden sm:inline'>{armed ? 'Confirm' : ''}</span>
    </button>
  );
}

function DraggableCard({ children, index, onMove }) {
  const ref = useRef(null);

  const onDragStart = e => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    const crt = ref.current;
    if (crt) {
      const rect = crt.getBoundingClientRect();
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(rect.width, 200);
      canvas.height = 20;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#c7d2fe';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        e.dataTransfer.setDragImage(canvas, 0, 0);
      }
    }
  };

  const onDragOver = e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = e => {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData('text/plain'));
    const to = index;
    if (Number.isFinite(from) && Number.isFinite(to) && from !== to) {
      onMove(from, to);
    }
  };

  return (
    <div ref={ref} draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} className='group/drag rounded-lg'>
      {children}
    </div>
  );
}

function GripDots() {
  return (
    <svg width='25' height='25' viewBox='0 0 24 24' className='text-slate-400'>
      <circle cx='9' cy='7' r='1.5' fill='currentColor' />
      <circle cx='15' cy='7' r='1.5' fill='currentColor' />
      <circle cx='9' cy='12' r='1.5' fill='currentColor' />
      <circle cx='15' cy='12' r='1.5' fill='currentColor' />
      <circle cx='9' cy='17' r='1.5' fill='currentColor' />
      <circle cx='15' cy='17' r='1.5' fill='currentColor' />
    </svg>
  );
}

/* =========================
   Helpers
   ========================= */
function blankItem() {
  return {
    name: '',
    quantity: null, // grams
    calories: 0,
  };
}

function blankSupplement() {
  return {
    name: '',
    time: '',
    timing: '',
    bestWith: '',
  };
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// legacy to new items-only shape (no desc/macros)
function mapFoodsToMeals(foods = []) {
  if (!foods?.length) return [];
  return [
    {
      title: 'Meal',
      time: '',
      items: foods.map(f => ({
        name: f.name,
        quantity: coerceNum(f.quantity, null),
        calories: coerceNum(f.calories),
      })),
      supplements: [],
    },
  ];
}

function coerceNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

// Strictly keep only allowed keys for Item
function sanitizeItem(it) {
  return {
    name: it?.name ?? '',
    quantity: it?.quantity == null || it?.quantity === '' ? null : coerceNum(it.quantity, null),
    calories: coerceNum(it?.calories),
  };
}

function sanitizeSupplement(s) {
  return {
    name: s?.name ?? '',
    time: s?.time ? String(s.time) : '',
    timing: s?.timing ? String(s.timing) : '',
    bestWith: s?.bestWith ? String(s.bestWith) : '',
  };
}

function cloneMealsStrict(meals = []) {
  return (meals || []).map(m => ({
    title: m?.title ?? 'Meal',
    time: m?.time ? String(m.time) : '',
    items: (m?.items || []).map(sanitizeItem),
    supplements: (m?.supplements || []).map(sanitizeSupplement),
  }));
}

function mealsToServerMealsStrict(formMeals = []) {
  return formMeals.map(m => ({
    title: m.title,
    time: m.time ? m.time : null, // '' → null for API
    items: (m.items || []).map(sanitizeItem),
    supplements: (m.supplements || []).map(sanitizeSupplement),
  }));
}

function getErr(errors, path) {
  try {
    const segs = path.split('.');
    let cur = errors;
    for (const s of segs) cur = cur?.[s];
    return typeof cur?.message === 'string' ? cur.message : undefined;
  } catch {
    return undefined;
  }
}
