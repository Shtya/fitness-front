'use client';

import React, { useCallback, useEffect, useMemo, useState, memo, useRef, forwardRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { GripVertical, Plus, X, PencilLine, Calendar, Target, TrendingUp, Eye, Users as UsersIcon, Pill, Clock, ChevronDown, ChevronRight, ChefHat, UtensilsCrossed, Sparkles, Search, Check, CheckCircle, ListChecks, NotebookPen, StickyNote, ListTodo, Quote, AlertTriangle, Trash2 } from 'lucide-react';

import { useForm, Controller, useFieldArray } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

import api from '@/utils/axios';
import { useUser } from '@/hooks/useUser';
import { useLocale, useTranslations } from 'next-intl';
import { Modal, StatCard } from '@/components/dashboard/ui/UI';
import { Notification } from '@/config/Notification';
import Select from '@/components/atoms/Select';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import { TimeField } from '@/components/atoms/InputTime';
import Input from '@/components/atoms/Input';
import { useAdminClients } from '@/hooks/useHierarchy';
import MultiLangText from '@/components/atoms/MultiLangText';
import Button from '@/components/atoms/Button';

const hhmmRegex = /^$|^([01]\d|2[0-3]):([0-5]\d)$/;

export function CButton({ name, icon, className = '', type = 'button', onClick, disabled = false, loading = false, variant = 'primary', size = 'md', title }) {
  const t = useTranslations('nutrition');

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
    <button type={type} title={title || (name ? t(name) : '')} disabled={disabled || loading} onClick={onClick} className={['inline-flex items-center gap-2 rounded-lg shadow-sm transition-all focus-visible:outline-none active:scale-[.99]', variantMap[variant] || variantMap.primary, sizeMap[size] || sizeMap.md, disabled || loading ? 'opacity-60 cursor-not-allowed' : '', className].join(' ')}>
      {loading && (
        <svg className='h-4 w-4 animate-spin' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
          <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
          <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z'></path>
        </svg>
      )}
      {icon}
      {name ? t(name) : null}
    </button>
  );
}

function CheckBox({ id = 'custom', label, initialChecked = false, onChange = () => {}, className = '' }) {
  const [checked, setChecked] = useState(!!initialChecked);
  useEffect(() => setChecked(!!initialChecked), [initialChecked]);

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

function buildSchemas(t) {
  const mealItemSchema = yup.object().shape({
    name: yup.string().trim().required(t('validation.required')),
    quantity: yup.number().typeError(t('validation.number')).min(0, t('validation.min')).nullable(),
    calories: yup.number().typeError(t('validation.number')).min(0, t('validation.min')).required(t('validation.required')),
  });

  // timing REMOVED
  const supplementSchema = yup.object().shape({
    name: yup.string().trim().required(t('validation.required')),
    time: yup
      .string()
      .transform(v => (v == null ? '' : v))
      .matches(hhmmRegex, t('validation.hhmm'))
      .nullable(),
    bestWith: yup.string().trim().nullable(),
  });

  const mealSchema = yup.object().shape({
    title: yup.string().trim().required(t('validation.required')),
    time: yup
      .string()
      .transform(v => (v == null ? '' : v))
      .matches(hhmmRegex, t('validation.hhmm'))
      .nullable(),
    items: yup.array().of(mealItemSchema).min(1, t('validation.add_item')),
    supplements: yup.array().of(supplementSchema),
  });

  const baseFormSchema = yup.object().shape({
    name: yup.string().trim().required(t('validation.plan_name_required')),
    description: yup.string().trim().nullable(),
    notes: yup.string().trim().nullable(),
    notesList: yup.array().of(yup.string().trim()).default([]),
    baseMeals: yup.array().of(mealSchema).min(1, t('validation.add_meal')),
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

  return { mealItemSchema, supplementSchema, mealSchema, baseFormSchema };
}

const DEFAULT_NOTES = ''.split('\n').filter(Boolean);

export default function NutritionManagementPage() {
  const t = useTranslations('nutrition');
  const scrollRef = useRef(null);

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
    } else setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
  };

  const user = useUser();
  const clients = useAdminClients(user?.id, { page: 1, limit: 100, search: '' });
  const [clientsCoach, setClientsCoach] = useState();

  useEffect(() => {
    if (user?.role == 'coach') api.get(`auth/coaches/${user?.id}/clients?limit=1000`).then(res => setClientsCoach(res.data));
  }, []);

  const optionsClient = useMemo(() => {
    const list = [];
    if (user?.role == 'admin') {
      if (clients?.items?.length) {
        for (const coach of clients.items) {
          list.push({
            id: coach.id,
            label: coach.name,
          });
        }
      }
    } else {
      if (clientsCoach?.users?.length) {
        for (const coach of clientsCoach.users) {
          list.push({
            id: coach.id,
            label: coach.name,
          });
        }
      }
    }
    return list;
  }, [user, clients?.items]);

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
      const { data } = await api.get(user?.role == 'admin' ? '/nutrition/meal-plans' : `/nutrition/meal-plans?user_id=${user?.adminId}`, {
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

  const onViewDetails = async plan => {
    setSelectedPlan(plan);
    setDetailsOpen(true);
    setSelectedPlan(p => ({ ...(p || plan) }));
  };

  const onCreate = async payload => {
    try {
      await api.post('/nutrition/meal-plans', payload);
      Notification(t('toast.created'), 'success');
      setAddPlanOpen(false);
      await fetchPlans();
    } catch (e) {
      Notification(e?.response?.data?.message || t('toast.create_failed'), 'error');
    }
  };

  const onUpdate = async (planId, payload) => {
    try {
      await api.put(`/nutrition/meal-plans/${planId}`, payload);
      Notification(t('toast.updated'), 'success');
      setEditPlan(null);
      await fetchPlans();
    } catch (e) {
      Notification(e?.response?.data?.message || t('toast.update_failed'), 'error');
    }
  };

  const onAssign = async (planId, userId, setSubmitting) => {
    try {
      await api.post(`/nutrition/meal-plans/${planId}/assign`, { userId });
      Notification(t('toast.assigned'), 'success');
      setAssignPlanOpen(null);
      await fetchPlans();
      if (selectedPlan?.id === planId) {
        setSelectedPlan(p => ({ ...(p || {}) }));
      }
    } catch (e) {
      Notification(e?.response?.data?.message || t('toast.assign_failed'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!deletePlanId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/nutrition/meal-plans/${deletePlanId}`);
      Notification(t('toast.deleted'), 'success');
      setDeleteOpen(false);
      setDeletePlanId(null);
      await fetchPlans();
    } catch (e) {
      Notification(e.response.data?.message, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className='space-y-5 sm:space-y-6'>
      <GradientStatsHeader onClick={() => setAddPlanOpen(true)} btnName={t('btn.new_plan')} title={t('ui.title')} desc={t('ui.subtitle')} loadingStats={loadingStats}>
        <StatCard icon={Target} title={t('stats.global_plans')} value={stats?.totals?.globalPlansCount} />
        <StatCard icon={TrendingUp} title={t('stats.my_plans')} value={stats?.totals?.myPlansCount} />
      </GradientStatsHeader>

      <div className='relative'>
        <div className='flex items-center justify-between gap-2 flex-wrap'>
          <div className='relative flex-1 max-w-[240px] sm:min-w-[260px]'>
            <Search className='absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
            <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder={t('search.placeholder')} className={['h-11 w-full px-8 rounded-lg', 'border border-slate-200 bg-white/90 text-slate-900', 'shadow-sm hover:shadow transition', 'focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200/40'].join(' ')} />
            {!!searchText && (
              <button type='button' onClick={() => setSearchText('')} className='absolute rtl:left-2 ltr:right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100' aria-label={t('actions.clear')} title={t('actions.clear')}>
                <X className='w-4 h-4' />
              </button>
            )}
          </div>

          <div className='flex items-center gap-2'>
            <div className='min-w-[80px]'>
              <Select
                searchable={false}
                clearable={false}
                className='!w-full'
                placeholder={t('search.per_page')}
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

            <CButton onClick={() => toggleSort('created_at')} icon={<Clock size={18} />} name={sortBy === 'created_at' ? (sortOrder === 'ASC' ? 'search.oldest_first' : 'search.newest_first') : 'search.sort_by_date'} variant='neutral' />
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

      <Modal open={addPlanOpen} maxH='h-fit ' cn='!py-0' onClose={() => setAddPlanOpen(false)} title={t('modals.create_title')} scrollRef={scrollRef}>
        <MealPlanForm scrollRef={scrollRef} onSubmitPayload={onCreate} submitLabel='btn.create' />
      </Modal>

      {/* Edit */}
      <Modal scrollRef={scrollRef} open={!!editPlan} onClose={() => setEditPlan(null)} title={editPlan ? `${t('modals.edit_title')}: ${editPlan.name}` : ''}>
        <div className='rounded-lg bg-gradient-to-b from-indigo-50/70 to-white p-3 sm:p-4'>{editPlan && <MealPlanForm scrollRef={scrollRef} initialPlan={editPlan} onSubmitPayload={payload => onUpdate(editPlan.id, payload)} submitLabel='btn.update' />}</div>
      </Modal>

      {/* Assign */}
      <Modal maxW='max-w-[500px] ' open={!!assignPlanOpen} onClose={() => setAssignPlanOpen(null)} title={assignPlanOpen ? `${t('modals.assign_title')}: ${assignPlanOpen.name}` : ''}>
        {assignPlanOpen && <AssignPlanForm onClose={() => setAssignPlanOpen(null)} plan={assignPlanOpen} clients={optionsClient} onAssign={(userId, setSubmitting) => onAssign(assignPlanOpen.id, userId, setSubmitting)} />}
      </Modal>

      {/* Details */}
      <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)} title={selectedPlan ? `${t('modals.details_title')}: ${selectedPlan.name}` : t('modals.details_title')}>
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
        title={t('confirm.delete_title')}
        message={t('confirm.delete_msg')}
        confirmText={t('btn.delete')}
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

export function MealPlanForm({ scrollRef, initialPlan, onSubmitPayload, submitLabel = 'btn.save' }) {
  const t = useTranslations('nutrition');
  const { baseFormSchema } = buildSchemas(t);

  const defaultMeals = [{ title: t('form.meal_name'), time: '', items: [blankItem()], supplements: [] }];

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
  }, [initialPlan, t]); // include t so default meal label updates if locale changes

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
  const locale = useLocale(); // or however you get the locale

  const [aiText, setAiText] = useState(locale === 'ar' ? 'أنشئ خطة وجبات لإعادة تكوين الجسم تحتوي على 2300 سعرة حرارية و5 وجبات يوميًا. قم بتضمين متعدد الفيتامينات بعد الوجبة 1 وأوميغا-3 بعد الوجبة 2.' : 'Create a 2300 calorie recomposition meal plan with 5 meals per day. Include a multivitamin after Meal 1 and omega-3 after Meal 2.');
  const [aiLoading, setAiLoading] = useState(false);

  const onSubmit = async data => {
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const baseMealsPayload = mealsToServerMealsStrict(data.baseMeals);

    const dayOverrides = {};
    dayKeys.forEach(k => {
      const overrideMeals = data?.dayOverrides?.[k] || [];
      if (Array.isArray(overrideMeals) && overrideMeals.length > 0 && data.customizeDays) {
        dayOverrides[k] = {
          day: k,
          meals: mealsToServerMealsStrict(overrideMeals),
          supplements: [], // no day-level supplements UI
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

  // ===== AI integration =====
  function normalizeAiResponse(raw) {
    if (raw && typeof raw === 'object' && (raw.meals || raw.name)) return raw;
    const maybeContent = raw?.content ?? raw?.choices?.[0]?.message?.content ?? raw;
    if (maybeContent && typeof maybeContent === 'object' && (maybeContent.meals || maybeContent.name)) return maybeContent;
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
      const { data } = await api.post('/nutrition/ai/generate', { prompt });
      const parsed = normalizeAiResponse(data);

      const safeMeals = (Array.isArray(parsed?.meals) ? parsed.meals : []).map(m => ({
        title: m?.title || t('form.meal_name'),
        time: m?.time || '',
        items: (m?.items || []).map(it => ({
          name: String(it?.name || '').trim(),
          quantity: it?.quantity === '' || it?.quantity === null || typeof it?.quantity === 'undefined' ? null : Number(it.quantity) || null,
          calories: Number(it?.calories) || 0,
        })),
        supplements: (m?.supplements || []).map(s => ({
          name: String(s?.name || '').trim(),
          time: s?.time ? String(s.time) : '',
          bestWith: s?.bestWith ? String(s.bestWith) : '',
        })),
      }));

      if (!safeMeals.length) throw new Error('AI returned no meals.');

      setValue('baseMeals', safeMeals, { shouldValidate: true, shouldDirty: true });
      if (parsed?.name) setValue('name', String(parsed.name), { shouldDirty: true });
      if (parsed?.description) setValue('description', String(parsed.description), { shouldDirty: true });

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

      Notification(t('toast.ai_filled'), 'success');
      setAiOpen(false);
      setAiText('');
    } catch (e) {
      Notification(e?.message || t('toast.ai_failed'), 'error');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <form className='space-y-6 mt-2' onSubmit={handleSubmit(onSubmit)}>
      {/* Name / Desc */}
      <div className='grid grid-cols-2 max-md:grid-cols-1 gap-3'>
        <Controller name='name' control={control} render={({ field }) => <Input placeholder={t('form.plan_name')} name='name' value={field.value} onChange={field.onChange} required error={errors?.name?.message} />} />
        <Controller name='description' control={control} render={({ field }) => <Input placeholder={t('form.description')} name='description' value={field.value} onChange={field.onChange} error={errors?.description?.message} />} />
        {/* Bullet Notes */}
        <Controller name='notesList' control={control} render={({ field }) => <NotesListInput value={Array.isArray(field.value) && field.value.length ? field.value : ['']} onChange={field.onChange} />} />
      </div>

      {/* Base Day */}
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <h4 className='font-medium text-slate-800 flex items-center gap-2'>
            {t('form.base_day_title')}
            <Clock size={16} className=' rtl:order-[-1] text-slate-500' />
          </h4>

          <div className='flex items-center gap-2'>
            <CButton
              name='btn.add_meal'
              size='sm'
              className='!bg-white'
              icon={<Plus size={14} />}
              onClick={() => {
                appendMeal({
                  title: `${t('form.meal_name')} ${baseMeals.length + 1}`,
                  time: '',
                  items: [blankItem()],
                  supplements: [],
                });

                setTimeout(() => {
                  if (scrollRef.current) {
                    scrollRef.current.scrollTo({
                      top: scrollRef.current.scrollHeight,
                      behavior: 'smooth',
                    });
                  }
                }, 0);
              }}
              variant='outline'
            />
          </div>
        </div>

        {baseMeals?.length ? (
          <Reorder.Group axis='y' values={baseMeals} onReorder={newOrder => replaceMeals(newOrder)} className='space-y-2'>
            {baseMeals.map((m, mealIndex) => (
              <Reorder.Item key={m.id || mealIndex} value={m} dragListener className='rounded-lg border border-slate-200 bg-white px-3 py-4 '>
                <div className='flex items-center justify-between gap-3 mb-2'>
                  <div className='flex items-center gap-2 text-slate-600 min-w-0'>
                    <GripVertical className='w-4 h-4 shrink-0 cursor-grab text-slate-400' />
                    <Controller name={`baseMeals.${mealIndex}.title`} control={control} render={({ field }) => <Input className='max-w-[300px]' placeholder={t('form.meal_name')} value={field.value} onChange={field.onChange} required error={getErr(errors, `baseMeals.${mealIndex}.title`)} />} />
                    <Controller name={`baseMeals.${mealIndex}.time`} control={control} render={({ field }) => <TimeField className='w-[160px]' showLabel={false} value={field.value || ''} onChange={field.onChange} error={getErr(errors, `baseMeals.${mealIndex}.time`)} />} />
                  </div>

                  <DangerX onClick={() => removeMeal(mealIndex)} title={t('btn.remove_meal')} />
                </div>

                <MealBlocks ctx={{ control, basePath: `baseMeals.${mealIndex}`, errors }} />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        ) : (
          <div className='rounded-lg border border-dashed border-slate-200 bg-white/70 py-6 text-center text-sm text-slate-500'>{t('empty.no_meals_hint')}</div>
        )}

        {errors?.baseMeals?.message && <p className='text-sm text-red-600'>{errors.baseMeals.message}</p>}
      </div>

      {/* Customize Days Toggle */}
      <Controller name='customizeDays' control={control} render={({ field }) => <CheckBox id='customizeDays' label={t('form.customize_days')} initialChecked={!!field.value} onChange={field.onChange} />} />

      {customizeDays && <DayOverrides control={control} errors={errors} />}

      {/* AI Assist */}
      {aiOpen && (
        <div className='rounded-lg border border-indigo-200 bg-indigo-50/40 p-3 space-y-2'>
          <textarea rows={3} className='w-full bg-white rounded-lg border border-slate-200 p-3 focus:outline-none focus:ring-4 focus:ring-indigo-200/40' placeholder='e.g., 2300 kcal recomposition, 5 meals, add multivitamin after Meal 1, omega after Meal 2…' value={aiText} onChange={e => setAiText(e.target.value)} />
          <div className='flex items-center justify-end gap-2'>
            <CButton name='btn.generate' onClick={runAiFill} loading={aiLoading} variant='primary' />
          </div>
        </div>
      )}

      <div className='flex items-center justify-end gap-2 pt-2'>
        <div className='flex items-center gap-2'>
          <CButton type='button' onClick={() => setAiOpen(o => !o)} icon={<Sparkles size={16} />} name='btn.ai_assist' variant='outline' />
        </div>

        <CButton name={submitLabel} type='submit' variant='primary' loading={isSubmitting} />
      </div>
    </form>
  );
}

function buildAiPrompt(userText) {
  // timing removed from supplements
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
        { "name": "Multivitamin", "time": "08:30", "bestWith": "water" }
      ]
    }
  ]
}

Rules:
- Use 24h "HH:MM" for any time (or empty string).
- Items ONLY have: name (string), quantity (number or null), calories (number).
- Provide 3–6 meals unless the user clearly asks otherwise.
- Keep supplements fields to: name, time, bestWith.
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
  const t = useTranslations('nutrition');
  const { control, basePath, errors } = ctx;

  const { fields: itemFields, append: appendItem, remove: removeItem, move: moveItem } = useFieldArray({ control, name: `${basePath}.items` });
  const { fields: supFields, append: appendSup, remove: removeSup, move: moveSup } = useFieldArray({ control, name: `${basePath}.supplements` });

  const addItem = () => appendItem(blankItem());
  const addSup = () => appendSup(blankSupplement());

  return (
    <div className='mt-3 space-y-3'>
      {/* -------- Items -------- */}
      <div className='p-4 space-y-2'>
        {itemFields.map((f, idx) => (
          <DraggableCard key={f.id || idx} index={idx} onMove={(from, to) => moveItem(from, to)}>
            <div className='flex flex-col gap-2 rounded-lg'>
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2 text-slate-500'>
                  <div className='flex-none'>
                    <GripDots />
                  </div>
                  <div className='grid grid-cols-2 md:grid-cols-[1fr_150px_140px] gap-3'>
                    <Controller name={`${basePath}.items.${idx}.name`} control={control} render={({ field }) => <Input placeholder={t('form.item_name')} value={field.value} onChange={field.onChange} required error={getErr(errors, `${basePath}.items.${idx}.name`)} />} />
                    <Controller name={`${basePath}.items.${idx}.quantity`} control={control} render={({ field }) => <Input placeholder={t('form.qty_g')} value={field.value == null ? '' : field.value} onChange={v => field.onChange(asNumber(v))} error={getErr(errors, `${basePath}.items.${idx}.quantity`)} inputMode='decimal' />} />
                    <Controller name={`${basePath}.items.${idx}.calories`} control={control} render={({ field }) => <Input placeholder={t('form.calories')} value={field.value == 0 ? null : field.value} onChange={v => field.onChange(asNumber(v))} required error={getErr(errors, `${basePath}.items.${idx}.calories`)} inputMode='decimal' />} />
                  </div>
                </div>
                <DangerX size='md' onClick={() => removeItem(idx)} title={t('btn.remove_meal')} />
              </div>
            </div>
          </DraggableCard>
        ))}
      </div>

      {/* -------- Supplements (timing REMOVED) -------- */}
      <div className='space-y-2'>
        {supFields.map((f, idx) => (
          <DraggableCard key={f.id || idx} index={idx} onMove={(from, to) => moveSup(from, to)}>
            <div className='flex items-center gap-2 justify-between rounded-lg px-4'>
              <div className='flex items-center gap-2 text-slate-500 w-full'>
                <div className='flex-none'>
                  <GripDots />
                </div>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-3 w-full'>
                  <Controller name={`${basePath}.supplements.${idx}.name`} control={control} render={({ field }) => <Input placeholder={t('form.supplement_name')} value={field.value} onChange={field.onChange} error={getErr(errors, `${basePath}.supplements.${idx}.name`)} />} />
                  <Controller name={`${basePath}.supplements.${idx}.time`} control={control} render={({ field }) => <TimeField showLabel={false} value={field.value || ''} onChange={field.onChange} error={getErr(errors, `${basePath}.supplements.${idx}.time`)} />} />
                  <Controller name={`${basePath}.supplements.${idx}.bestWith`} control={control} render={({ field }) => <Input placeholder={t('form.best_with')} value={field.value || ''} onChange={field.onChange} />} />
                </div>
              </div>
              <DangerX onClick={() => removeSup(idx)} title={t('btn.delete')} />
            </div>
          </DraggableCard>
        ))}
      </div>

      {/* -------- Bottom quick-add -------- */}
      <div className='border-t border-slate-200 pt-3 flex items-center justify-end gap-2'>
        <CButton name='btn.add_item' size='sm' className='!bg-white' icon={<Plus size={14} />} onClick={addItem} variant='outline' />
        <CButton name='btn.add_supplement' size='sm' className='!bg-white' icon={<Pill size={14} />} onClick={addSup} variant='outline' />
      </div>
    </div>
  );
});

export function NotesListInput({ value = [''], onChange }) {
  const t = useTranslations('nutrition');
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
          <li key={i} className='  flex items-center gap-2'>
            <NotebookPen className='h-[25px] w-4 text-emerald-500 flex-shrink-0' />
            <input
              ref={el => (refs[i] = el)}
              className='flex-1 text-[13px] outline-none hover:border-slate-400 focus:border-emerald-500 transition'
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
              placeholder={t('notes.placeholder')}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DayOverrides({ control, errors }) {
  const t = useTranslations('nutrition');
  const days = [
    { key: 'saturday', label: t('days.saturday') },
    { key: 'sunday', label: t('days.sunday') },
    { key: 'monday', label: t('days.monday') },
    { key: 'tuesday', label: t('days.tuesday') },
    { key: 'wednesday', label: t('days.wednesday') },
    { key: 'thursday', label: t('days.thursday') },
    { key: 'friday', label: t('days.friday') },
  ];

  const [openDays, setOpenDays] = useState({});
  const toggle = key => setOpenDays(s => ({ ...s, [key]: !s[key] }));
  const ensureOpen = key => setOpenDays(s => ({ ...s, [key]: true }));

  function DayOverrideBlock({ control, basePath, label, errors, dayKey, isOpen, onToggle, onEnsureOpen }) {
    const { fields, append, remove, move } = useFieldArray({ control, name: basePath });

    return (
      <div className='border border-slate-200 bg-white rounded-lg overflow-hidden'>
        <button type='button' onClick={() => onToggle(dayKey)} className='w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50'>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-slate-800'>{label}</span>
          </div>
          <span className='text-xs text-slate-500 flex items-center gap-2 '>
            {fields.length > 0 && (
              <span>
                {fields.length} {t('details.meals')}
              </span>
            )}
            <div className='rotate-[90deg]'>{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</div>
          </span>
        </button>

        {isOpen && (
          <div className='p-3 space-y-3 bg-slate-50/60'>
            <div className='flex items-center justify-between'>
              <div />
              <CButton
                name='btn.add_meal'
                icon={<Plus size={14} />}
                onClick={e => {
                  e.stopPropagation();
                  append({ title: `${t('form.meal_name')} ${fields.length + 1}`, time: '', items: [blankItem()], supplements: [] });
                  onEnsureOpen(dayKey);
                }}
                variant='outline'
                size='sm'
              />
            </div>

            <div className='space-y-2'>
              {fields.map((m, mi) => (
                <DraggableCard key={m.id || mi} index={mi} onMove={(from, to) => move(from, to)}>
                  <div className='rounded-lg bg-white border-slate-200 border p-3'>
                    <div className='flex items-center justify-between mb-2'>
                      <div className='flex items-center gap-2 text-slate-500'>
                        <GripDots />
                        <div className='text-sm font-medium text-slate-700'>
                          {useTranslations('nutrition')('form.meal_name')} {mi + 1}
                        </div>
                      </div>
                      <DangerX onClick={() => remove(mi)} title={useTranslations('nutrition')('btn.remove_meal')} />
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                      <Controller name={`${basePath}.${mi}.title`} control={control} render={({ field }) => <Input placeholder={t('form.meal_name')} value={field.value} onChange={field.onChange} required error={getErr(errors, `${basePath}.${mi}.title`)} />} />
                      <Controller name={`${basePath}.${mi}.time`} control={control} render={({ field }) => <TimeField showLabel={false} value={field.value || ''} onChange={field.onChange} error={getErr(errors, `${basePath}.${mi}.time`)} />} />
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
      <h4 className='font-medium text-slate-800'>{t('form.customize_days')}</h4>
      <p className='text-xs text-slate-500'>{/* يمكن إضافة وصف مترجم إن لزم */}</p>

      <div className='space-y-2'>
        {days.map(d => (
          <DayOverrideBlock key={d.key} control={control} basePath={`dayOverrides.${d.key}`} label={d.label} errors={errors} dayKey={d.key} isOpen={!!openDays[d.key]} onToggle={toggle} onEnsureOpen={ensureOpen} />
        ))}
      </div>
    </div>
  );
}

/* =========================
	 Details View
	 ========================= */
export function PlanDetailsView({ plan }) {
  const t = useTranslations('nutrition');
  const [open, setOpen] = useState({});
  const toggle = key => setOpen(p => ({ ...p, [key]: !p[key] }));
  const mapFoodsToMealsLocal = (foods = []) => [{ title: t('form.meal_name'), items: foods }];

  const spring = { type: 'spring', stiffness: 300, damping: 30, mass: 0.7 };

  const sumCalories = meals => {
    let total = 0;
    (meals || []).forEach(m => (m.items || []).forEach(it => (total += Number(it.calories || 0))));
    return total;
  };

  return (
    <div className='space-y-4'>
      {!!plan?.desc && <div className='text-sm text-slate-700'>{plan.desc}</div>}

      {!!plan?.notes && (
        <div className='rounded-lg border border-amber-200 bg-amber-50 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.5)]'>
          <div className='mb-1 text-sm font-semibold text-amber-900'>{t('details.notes')}</div>
          <pre className='whitespace-pre-wrap text-[13px] leading-6 text-amber-900'>{plan.notes}</pre>
        </div>
      )}

      <div className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
        {plan?.days?.map((d, idx) => {
          const dayKey = d.day || `day-${idx}`;
          const meals = d.meals || mapFoodsToMealsLocal(d.foods || []);
          const isOpen = !!open[dayKey];
          const totals = sumCalories(meals);

          return (
            <div key={dayKey} className='border-b border-slate-200 last:border-b-0'>
              <button type='button' onClick={() => toggle(dayKey)} className='group flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50'>
                <div className='flex items-center gap-2'>
                  <motion.span initial={false} animate={{ rotate: isOpen ? 180 : 0 }} transition={spring} className='inline-flex'>
                    <ChevronDown size={16} className='text-slate-600' />
                  </motion.span>
                  <span className='font-medium text-slate-800'>{t(d.name.toLowerCase())}</span>
                </div>
                <div className='flex items-center gap-3 text-xs text-slate-600'>
                  <span className='rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 shadow-sm'>
                    {meals.length} {t('details.meals')}
                  </span>
                  <span className='inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 shadow-sm'>
                    <ChefHat size={12} className='text-indigo-600' />
                    {`${totals} ${t('details.kcal')}`}
                  </span>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div key='content' initial={{ height: 0, opacity: 0, y: -8 }} animate={{ height: 'auto', opacity: 1, y: 0 }} exit={{ height: 0, opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }} className='overflow-hidden'>
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.25 }} className='space-y-3 bg-slate-50/60 px-3 pb-3'>
                      {meals.map((m, mi) => {
                        const mealCals = (m.items || []).reduce((a, b) => a + Number(b.calories || 0), 0);
                        return (
                          <motion.div key={mi} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='rounded-lg border border-slate-200 bg-white p-3 shadow-sm'>
                            <div className='flex items-center justify-between'>
                              <div className='flex items-center gap-2 font-medium text-slate-800'>
                                <UtensilsCrossed size={16} className='text-indigo-600' />
                                {m.title || `${t('form.meal_name')} ${mi + 1}`}
                                <div className='mt-1 text-[11px] text-slate-500'>
                                  ~ {mealCals} {t('details.kcal')}
                                </div>
                              </div>
                              <div className='flex items-center gap-1 text-xs text-slate-500'>
                                <Clock size={14} /> {m.time || '—'}
                              </div>
                            </div>

                            {m.items?.length > 0 && (
                              <div className='mt-3'>
                                <div className='overflow-x-auto'>
                                  <table className='w-full text-sm'>
                                    <thead>
                                      <tr className=' rtl:text-right ltr:text-left text-slate-500'>
                                        <th className='py-1 pr-3'>{t('table.item')}</th>
                                        <th className='py-1 pr-3'>{t('table.qty_g')}</th>
                                        <th className='py-1 pr-3'>{t('table.calories')}</th>
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

                            {m.supplements?.length > 0 && (
                              <div className='mt-3'>
                                <div className='mb-1 flex items-center gap-1 text-sm font-medium text-slate-700'>
                                  <span className='inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200'>
                                    <Clock size={12} />
                                  </span>
                                  {t('details.supplements')}
                                </div>
                                <div>
                                  {m.supplements.map((s, si) => (
                                    <div key={si} className='grid grid-cols-3 gap-2 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm'>
                                      <div className='font-medium text-slate-800'>{s.name}</div>
                                      <div className='text-slate-600'>
                                        {t('details.time')}: {s.time || '—'}
                                      </div>
                                      <div className='text-slate-600'>
                                        {t('details.best_with')}: {s.bestWith || '—'}
                                      </div>
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
    </div>
  );
}

/* =========================
	 Assign Form
	 ========================= */
function AssignPlanForm({ onClose, clients, onAssign }) {
  const t = useTranslations('nutrition');
  const [userId, setUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async e => {
    e.preventDefault();
    if (!userId) return;
    setSubmitting(true);
    await onAssign(userId, setSubmitting);
  };

  return (
    <form onSubmit={submit} className='space-y-4'>
      <div className=' space-y-4'>
        <Select className={'w-full flex-1'} options={clients} value={userId} onChange={setUserId} placeholder={t('assign.select_client')} />

        <div className='flex items-center justify-end gap-2 pt-2'>
          <Button onClick={onClose} type='button' color='outline' name={t('btn.cancel')} />
          <Button disabled={!userId} loading={submitting} type='submit' color='primary' name={submitting ? t('btn.assigning') : t('btn.assign_plan')} />
        </div>
      </div>
    </form>
  );
}

export const PlanListView = memo(function PlanListView({ loading, plans = [], onPreview, onEdit, onDelete, onAssign }) {
  const t = useTranslations('nutrition');
  const user = useUser();

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
        <h3 className='mt-4 text-lg font-semibold text-slate-900'>{t('list.empty_title')}</h3>
        <p className='mt-1 text-sm text-slate-600'>{t('list.empty_desc')}</p>
      </div>
    );
  }

  return (
    <div className='divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
      {plans.map(p => {
        return (
          <div key={p.id} className='group relative flex items-start gap-3 px-4 py-3 transition-all duration-300 hover:bg-slate-50/60'>
            <span aria-hidden className='absolute left-0 top-0 h-full w-1 rounded-tr-lg rounded-br-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-70' />

            <div className='mt-0.5 grid h-12 w-12 shrink-0 place-content-center rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-95 text-white shadow-sm'>
              <UtensilsCrossed className='h-5 w-5' />
            </div>

            <div className='min-w-0 flex-1'>
              <MultiLangText className='truncate text-sm font-semibold text-slate-900'>{p.name}</MultiLangText>
              {p.desc || p.notes ? <MultiLangText className='line-clamp-1 text-[13px] leading-5 text-slate-600'>{p.desc ?? p.notes}</MultiLangText> : <p className='mt-1 text-[13px] text-slate-500'>{t('list.no_desc')}</p>}
            </div>

            <div className='ml-auto flex shrink-0 items-center gap-1'>
              <button type='button' onClick={() => onAssign?.(p)} className='inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-all hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30 active:scale-[.98]' title={t('btn.assign')}>
                <UsersIcon className='h-4 w-4' />
                {t('btn.assign')}
              </button>

              <div className='flex items-center gap-1'>
                <button type='button' title={t('btn.preview')} onClick={() => onPreview?.(p)} className=' cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30'>
                  <Eye className='h-4 w-4' />
                </button>

                {/* Edit */}
                {p?.adminId != null && (
                  <button type='button' title={t('btn.edit')} onClick={() => onEdit?.(p)} className=' cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/30'>
                    <PencilLine className='h-4 w-4' />
                  </button>
                )}

                {p?.adminId != null && (
                  <button type='button' title={t('btn.delete')} onClick={() => onDelete?.(p.id)} className=' cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300/30'>
                    <Trash2 className='h-4 w-4' />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

function ConfirmDialog({ loading, open, onClose, title, message, confirmText, onConfirm }) {
  const t = useTranslations('nutrition');
  if (!open) return null;
  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg p-6 max-w-md w-full mx-4'>
        <h3 className='text-lg font-semibold text-slate-800 mb-2'>{title}</h3>
        <p className='text-slate-600 mb-4'>{message}</p>
        <div className='flex items-center justify-end gap-2'>
          <CButton onClick={onClose} disabled={loading} name='btn.cancel' variant='outline' />
          <CButton onClick={onConfirm} disabled={loading} name={loading ? 'btn.deleting' : 'btn.delete'} variant='danger' />
        </div>
      </div>
    </div>
  );
}

 

export function DangerX({
  onClick,
  title = 'Remove',
  size = 'md',
  loading = false,
  disabled = false,
  autoResetMs = 1500,
  icon: Icon = Trash2, // تقدر تغيّر الأيقونة
}) {
  const confirmText = useTranslations('nutrition')('btn.delete');
  const t = useTranslations('nutrition');
  const [armed, setArmed] = useState(false);
  const [remaining, setRemaining] = useState(Math.round(autoResetMs / 1000));
  const btnRef = useRef(null);
  const timerRef = useRef(null);
  const intervalRef = useRef(null);

  // Auto reset + countdown
  useEffect(() => {
    if (!armed) return;
    setRemaining(Math.max(1, Math.round(autoResetMs / 1000)));
    intervalRef.current = setInterval(() => {
      setRemaining(r => (r > 1 ? r - 1 : r));
    }, 1000);
    timerRef.current = setTimeout(() => setArmed(false), autoResetMs);
    return () => {
      clearTimeout(timerRef.current);
      clearInterval(intervalRef.current);
    };
  }, [armed, autoResetMs]);

  // خارج الزر → إلغاء
  useEffect(() => {
    const handleDoc = e => {
      if (!armed) return;
      if (btnRef.current && !btnRef.current.contains(e.target)) setArmed(false);
    };
    document.addEventListener('mousedown', handleDoc);
    return () => document.removeEventListener('mousedown', handleDoc);
  }, [armed]);

  const handleClick = () => {
    if (disabled || loading) return;
    if (armed) {
      onClick?.();
      setArmed(false);
      return;
    }
    setArmed(true);
  };

  const onKeyDown = e => {
    if (!armed && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setArmed(true);
      return;
    }
    if (armed && e.key === 'Enter') {
      e.preventDefault();
      onClick?.();
      setArmed(false);
      return;
    }
    if (e.key === 'Escape') {
      setArmed(false);
    }
  };

  const sizeStyles = {
    sm: 'h-9 px-2.5 text-xs',
    md: 'h-10 px-3 text-sm',
    lg: 'h-11 px-3.5 text-base',
  };

  const base = 'inline-flex items-center gap-2 rounded-lg border font-medium transition-all shadow-sm focus-visible:outline-none active:scale-[.98]';

  const idleColors = 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-red-300';
  const armedColors = 'border-red-200 bg-red-50 text-red-700 focus-visible:ring-2 focus-visible:ring-red-400';
  const disabledColors = 'opacity-60 cursor-not-allowed';

  const cls = [base, sizeStyles[size] || sizeStyles.md, disabled || loading ? disabledColors : armed ? armedColors : idleColors].join(' ');

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  return (
    <div className='relative inline-flex' ref={btnRef}>
      <button type='button' title={title} aria-label={title} aria-live='polite' aria-pressed={armed} disabled={disabled || loading} onClick={handleClick} onKeyDown={onKeyDown} className={cls}>
        {loading ? (
          <svg className='h-4 w-4 animate-spin' viewBox='0 0 24 24' fill='none'>
            <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
            <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z' />
          </svg>
        ) : armed ? (
          <AlertTriangle size={iconSize} className='text-red-600' />
        ) : (
          <Icon size={iconSize} className='text-red-600/80' />
        )}

        <span className={`${armed ? confirmText : 'sm:!hidden '} hidden sm:inline`}>{armed ? confirmText : null}</span>

        {/* عدّاد بسيط عند التأكيد */}
        <AnimatePresence>
          {armed && (
            <motion.span key='count' initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }} className='text-[11px] text-red-600/80 '>
              {remaining}s
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Tooltip مصغّر عند التأكيد */}
      <AnimatePresence>
        {armed && (
          <motion.div key='tip' initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }} className='absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] text-red-700 shadow-md' role='status'>
            {t('clickAgainToConfirm')}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
    if (Number.isFinite(from) && Number.isFinite(to) && from !== to) onMove(from, to);
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
  return { name: '', quantity: null, calories: 0 };
}

function blankSupplement() {
  // timing REMOVED
  return { name: '', time: '', bestWith: '' };
}

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

function sanitizeItem(it) {
  return {
    name: it?.name ?? '',
    quantity: it?.quantity == null || it?.quantity === '' ? null : coerceNum(it.quantity, null),
    calories: coerceNum(it?.calories),
  };
}

function sanitizeSupplement(s) {
  // timing REMOVED
  return {
    name: s?.name ?? '',
    time: s?.time ? String(s.time) : '',
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
    time: m.time ? m.time : null,
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
