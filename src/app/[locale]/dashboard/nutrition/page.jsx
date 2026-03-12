'use client';

import React, { useCallback, useEffect, useMemo, useState, memo, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
	GripVertical,
	Plus,
	X,
	PencilLine,
	Target,
	TrendingUp,
	Eye,
	Users as UsersIcon,
	Pill,
	Clock,
	ChevronDown,
	ChevronRight,
	ChefHat,
	UtensilsCrossed,
	Sparkles,
	Search,
	Check,
	AlertTriangle,
	Trash2,
	Copy,
	Replace,
	Calendar,
} from 'lucide-react';

import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

import api from '@/utils/axios';
import { useUser } from '@/hooks/useUser';
import { useLocale, useTranslations } from 'next-intl';
import { Modal, StatCard } from '@/components/dashboard/ui/UI';
import { Notification } from '@/config/Notification';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import { TimeField } from '@/components/atoms/InputTime';
import Input from '@/components/atoms/Input';
import { useAdminClients } from '@/hooks/useHierarchy';
import MultiLangText from '@/components/atoms/MultiLangText';
import Button from '@/components/atoms/Button';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PrettyPagination } from '@/components/dashboard/ui/Pagination';

import {
	Select as ShadcnSelect,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Select,
} from '@/components/ui/select';
import ActionButtons from '@/components/atoms/Actions';
import DataTable from '@/components/atoms/Datatable';
import { FaAudioDescription } from 'react-icons/fa6';
import { FaRegFileAlt } from 'react-icons/fa';

const hhmmRegex = /^$|^([01]\d|2[0-3]):([0-5]\d)$/;

/* ─────────────────── MiniField ─────────────────── */
export const MiniField = memo(function MiniField({
	cnParent,
	value,
	placeholder,
	inputMode,
	onChange,
	onBlur,
	className = '',
	type = 'text',
	iconLeft = null,
}) {
	const hasValue = String(value ?? '').trim().length > 0;

	return (
		<div className={`relative w-full ${cnParent || ''}`}>
			{hasValue && (
				<label className="absolute left-2 px-0.5 text-[9px] font-semibold -top-[7px] z-10 text-[color:var(--color-primary-600)] pointer-events-none"
					style={{ background: 'linear-gradient(to bottom, #f8fafc 50%, #ffffff 50%)' }}>
					{placeholder}
				</label>
			)}
			{iconLeft && <span className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">{iconLeft}</span>}
			<input
				value={value ?? ''}
				inputMode={inputMode}
				type={type}
				placeholder={placeholder}
				onChange={onChange}
				onBlur={onBlur}
				className={[
					'h-8 w-full rounded-lg border px-2 text-xs bg-white outline-none transition placeholder:text-slate-400',
					iconLeft ? 'pl-7' : '',
					'focus:ring-2 focus:ring-[color:var(--color-primary-200)] focus:border-[color:var(--color-primary-400)]',
					hasValue
						? 'border-[color:var(--color-primary-300)] hover:border-[color:var(--color-primary-400)]'
						: 'border-slate-200 hover:border-slate-300',
					className,
				].join(' ')}
			/>
		</div>
	);
});

/* ─────────────────── UnitSelect ─────────────────── */
const UnitSelect = memo(function UnitSelect({ value, onChange, error, disabled = false, className = '' }) {
	const t = useTranslations('nutrition');
	const locale = useLocale();
	const isRTL = locale === 'ar';

	return (
		<div className={`w-full relative ${className}`}>
			<div className={[
				'relative flex items-center rounded-lg border bg-white transition-all duration-200',
				error ? 'border-rose-400' : 'border-slate-200 hover:border-[color:var(--color-primary-300)]',
				disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
			].join(' ')}>
				<select
					value={value ?? 'g'}
					onChange={e => onChange?.(e.target.value)}
					disabled={disabled}
					className={[
						'custom-select h-8 w-full text-xs text-slate-900 outline-none bg-transparent',
						isRTL ? 'pr-3.5 pl-8' : 'pl-3 pr-8',
					].join(' ')}
					dir={isRTL ? 'rtl' : 'ltr'}
					aria-invalid={!!error}
				>
					<option value="g">{t('unit.g')}</option>
					<option value="count">{t('unit.count')}</option>
				</select>
				<span className="select-arrow rtl:!left-[8px] ltr:!right-[8px]">
					<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path d="M5.5 7.5L10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</span>
			</div>
			{error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
		</div>
	);
});

/* ─────────────────── CButton ─────────────────── */
export function CButton({
	name,
	icon,
	className = '',
	type = 'button',
	onClick,
	disabled = false,
	loading = false,
	variant = 'primary',
	size = 'md',
	title,
}) {
	const t = useTranslations('nutrition');

	const variantMap = {
		primary: 'theme-gradient-bg text-white hover:opacity-90 shadow-sm',
		outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs',
		ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
		success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
		warning: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm',
		danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
		neutral: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs',
	};

	const sizeMap = {
		sm: 'h-8 px-3 text-xs',
		md: 'h-10 px-4 text-sm',
		lg: 'h-11 px-5 text-sm',
	};

	return (
		<button
			type={type}
			title={title || (name ? t(name) : '')}
			disabled={disabled || loading}
			onClick={onClick}
			className={[
				'inline-flex items-center gap-2 rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-300)] active:scale-[.98]',
				variantMap[variant] || variantMap.primary,
				sizeMap[size] || sizeMap.md,
				disabled || loading ? 'opacity-60 cursor-not-allowed' : '',
				className,
			].join(' ')}
		>
			{loading && (
				<svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
					<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
					<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
				</svg>
			)}
			{icon}
			{name ? t(name) : null}
		</button>
	);
}

/* ─────────────────── CheckBox ─────────────────── */
function CheckBox({ id = 'custom', label, initialChecked = false, onChange = () => { }, className = '' }) {
	const [checked, setChecked] = useState(!!initialChecked);
	useEffect(() => setChecked(!!initialChecked), [initialChecked]);

	const toggle = () => { const next = !checked; setChecked(next); onChange(next); };
	const onKeyDown = (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } };

	return (
		<div className={`inline-flex items-center gap-3 ${className}`}>
			<button
				id={id}
				type="button"
				role="checkbox"
				aria-checked={checked}
				onClick={toggle}
				onKeyDown={onKeyDown}
				className={`relative cursor-pointer flex h-6 w-6 items-center justify-center rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary-300)]
					${checked ? 'theme-gradient-bg border-transparent shadow-sm' : 'bg-white border-slate-300 hover:border-[color:var(--color-primary-300)]'}`}
			>
				<motion.div initial={false} animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
					<Check className="h-3.5 w-3.5 text-white" />
				</motion.div>
			</button>
			{label && (
				<span className="text-sm font-medium text-slate-700 cursor-pointer select-none" onClick={toggle}>{label}</span>
			)}
		</div>
	);
}

function buildSchemas(t) {
	const mealItemSchema = yup.object().shape({
		name: yup.string().trim().required(t('validation.required')),
		unit: yup.string().oneOf(['g', 'count']).default('g'),
		quantity: yup.number().typeError(t('validation.number')).min(0, t('validation.min')).nullable(),
		calories: yup.number().typeError(t('validation.number')).min(0, t('validation.min')).required(t('validation.required')),
		alternative: yup.object().nullable().shape({
			name: yup.string().trim().default(''),
			unit: yup.string().oneOf(['g', 'count']).default('g'),
			quantity: yup.number().nullable(),
			calories: yup.number().min(0).default(0),
		}),
	});

	const supplementSchema = yup.object().shape({
		name: yup.string().trim().required(t('validation.required')),
		time: yup.string().transform(v => v == null ? '' : v).matches(hhmmRegex, t('validation.hhmm')).nullable(),
		bestWith: yup.string().trim().nullable(),
	});

	const mealSchema = yup.object().shape({
		title: yup.string().trim().required(t('validation.required')),
		time: yup.string().transform(v => v == null ? '' : v).matches(hhmmRegex, t('validation.hhmm')).nullable(),
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

/* ─────────────────── Main Page ─────────────────── */
export default function NutritionManagementPage() {
	const t = useTranslations('nutrition');
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const scrollRef = useRef(null);

	const openedFromUrlRef = useRef(null);
	const skipNextUrlOpenRef = useRef(true);

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

	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [searchText, setSearchText] = useState('');
	const [perPage, setPerPage] = useState(6);
	const [sortBy, setSortBy] = useState('created_at');
	const [sortOrder, setSortOrder] = useState('DESC');

	const toggleSort = (key) => {
		if (sortBy !== key) { setSortBy(key); setSortOrder('DESC'); }
		else setSortOrder(o => o === 'ASC' ? 'DESC' : 'ASC');
	};

	const user = useUser();
	const clients = useAdminClients(user?.id, { page: 1, limit: 100, search: '' });
	const [clientsCoach, setClientsCoach] = useState();

	useEffect(() => {
		if (user?.role == 'coach') api.get(`auth/coaches/${user?.id}/clients?limit=1000`).then(res => setClientsCoach(res.data));
	}, [user?.id, user?.role]);

	const optionsClient = useMemo(() => {
		const list = [];
		if (user?.role == 'admin') {
			if (clients?.items?.length) for (const c of clients.items) list.push({ id: c.id, label: c.name });
		} else {
			if (clientsCoach?.users?.length) for (const c of clientsCoach.users) list.push({ id: c.id, label: c.name });
		}
		return list;
	}, [user, clients?.items, clientsCoach?.users]);

	const fetchStats = useCallback(async () => {
		setLoadingStats(true);
		try {
			const { data } = await api.get('/nutrition/stats');
			setStats(data);
		} catch { setStats(null); } finally { setLoadingStats(false); }
	}, []);

	const fetchPlans = useCallback(async () => {
		setListLoading(true);
		try {
			const { data } = await api.get(user?.role == 'admin' ? '/nutrition/meal-plans' : `/nutrition/meal-plans?user_id=${user?.adminId}`, {
				params: { search: searchText || undefined, sortBy, sortOrder, page, limit: perPage },
			});
			setPlans(data.records || []);
			setTotal(data.total || 0);
		} catch {
			setPlans([]);
			setTotal(0);

		} finally { setListLoading(false); }
	}, [searchText, sortBy, sortOrder, page, perPage, user?.role, user?.adminId]);

	useEffect(() => { (async () => { await Promise.all([fetchStats(), fetchPlans()]); })(); }, [fetchStats, fetchPlans]);

	useEffect(() => {
		const planId = searchParams.get('plan_id');
		if (planId && plans.length > 0) {
			const plan = plans.find(p => p.id === planId);
			if (plan) onViewDetails(plan, true);
		}
	}, [searchParams, plans]);

	useEffect(() => {
		setPage(1);
	}, [searchText, sortBy, sortOrder]);

	const onViewDetails = async (plan, isEdit = false) => {
		if (isEdit) { setEditPlan(null); } else { setDetailsOpen(true); setSelectedPlan(null); }
		try {
			const { data } = await api.get(`/nutrition/meal-plans/${plan.id}`);
			if (isEdit) setEditPlan(data);
			else setSelectedPlan(data);
		} catch (e) {
			Notification(e?.response?.data?.message || t('toast.load_failed'), 'error');
			if (!isEdit) setDetailsOpen(false);
		}
	};

	const onCreate = async (payload) => {
		try {
			await api.post('/nutrition/meal-plans', payload);
			Notification(t('toast.created'), 'success');
			setAddPlanOpen(false);
			await fetchPlans();
		} catch (e) { Notification(e?.response?.data?.message || t('toast.create_failed'), 'error'); }
	};

	const clearPlanIdFromUrl = useCallback(() => {
		skipNextUrlOpenRef.current = true;
		const sp = new URLSearchParams(searchParams.toString());
		sp.delete('planId'); sp.delete('plan_id');
		const qs = sp.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		openedFromUrlRef.current = null;
	}, [router, pathname, searchParams]);

	const onUpdate = async (planId, payload) => {
		try {
			await api.put(`/nutrition/meal-plans/${planId}`, payload);
			Notification(t('toast.updated'), 'success');
			clearPlanIdFromUrl();
			setEditPlan(null);
			await fetchPlans();
		} catch (e) { Notification(e?.response?.data?.message || t('toast.update_failed'), 'error'); }
	};

	const onDuplicate = async (plan) => {
		try {
			const { data: fullPlan } = await api.get(`/nutrition/meal-plans/${plan.id}`);
			const draft = JSON.parse(JSON.stringify(fullPlan));
			draft.id = undefined; draft.name = `${draft.name || fullPlan.name} (Copy)`;
			draft.created_at = undefined; draft.updated_at = undefined;
			if (draft.days) {
				draft.days.forEach(d => {
					d.id = undefined; d.created_at = undefined; d.updated_at = undefined;
					(d.meals || []).forEach(m => {
						m.id = undefined; m.created_at = undefined; m.updated_at = undefined;
						(m.items || []).forEach(it => { it.id = undefined; it.created_at = undefined; it.updated_at = undefined; });
						(m.supplements || []).forEach(s => { s.id = undefined; s.created_at = undefined; s.updated_at = undefined; });
					});
				});
			}
			setEditPlan(draft);
		} catch (e) { Notification(e?.response?.data?.message || t('toast.duplicate_failed'), 'error'); }
	};

	const onAssign = async (planId, userId, setSubmitting) => {
		try {
			await api.post(`/nutrition/meal-plans/${planId}/assign`, { userId });
			Notification(t('toast.assigned'), 'success');
			setAssignPlanOpen(null);
			await fetchPlans();
			if (selectedPlan?.id === planId) setSelectedPlan(p => ({ ...(p || {}) }));
		} catch (e) { Notification(e?.response?.data?.message || t('toast.assign_failed'), 'error'); } finally { setSubmitting(false); }
	};

	const onDelete = async () => {
		if (!deletePlanId) return;
		setDeleteLoading(true);
		try {
			await api.delete(`/nutrition/meal-plans/${deletePlanId}`);
			Notification(t('toast.deleted'), 'success');
			setDeleteOpen(false); setDeletePlanId(null);
			await fetchPlans();
		} catch (e) { Notification(e.response?.data?.message, 'error'); } finally { setDeleteLoading(false); }
	};

	useEffect(() => {
		const planId = searchParams.get('planId') || searchParams.get('plan_id');
		if (!planId) return;
		if (skipNextUrlOpenRef.current) { skipNextUrlOpenRef.current = false; return; }
		if (openedFromUrlRef.current === planId) return;
		openedFromUrlRef.current = planId;
		const local = plans.find(p => p.id === planId);
		if (local) onViewDetails(local, true);
		else if (plans.length) onViewDetails({ id: planId }, true);
	}, [searchParams, plans]);


	const tableRows = useMemo(() => {
		return (plans || []).map((p) => ({
			id: p.id,
			name: p.name,
			desc: p.desc || p.notes || '',
			daysCount: Array.isArray(p.days) ? p.days.length : 0,
			createdAt: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : '—',
			raw: p,
		}));
	}, [plans]);


	const tableColumns = [
		{
			key: 'name',
			header: t('table.name'),
			cell: (row) => (
				<div className="flex items-center gap-3 min-w-0">
					<div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg theme-gradient-bg text-white shadow-sm">
						<UtensilsCrossed className="h-5 w-5" />
					</div>

					<div className="min-w-0">
						<MultiLangText className="truncate text-sm font-semibold text-slate-900">
							{row.name}
						</MultiLangText>
						{row.desc ? (
							<MultiLangText className="line-clamp-1 text-xs text-slate-500 mt-0.5">
								{row.desc}
							</MultiLangText>
						) : (
							<p className="text-xs text-slate-400 mt-0.5">{t('list.no_desc')}</p>
						)}
					</div>
				</div>
			),
		},
		{
			key: 'description',
			header: t('table.description'),
			cell: (row) => (
				<span dir='auto' className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold bg-[color:var(--color-primary-50)] text-[color:var(--color-primary-700)] border border-[color:var(--color-primary-200)]">
					<FaRegFileAlt className="w-3 h-3" />
					{row.desc?.length > 30 ? row.desc.slice(0, 30) + "..." : row.desc}
				</span>
			),
		}, 
		{
			key: 'createdAt',
			header: t('table.createdAt'),
			cell: (row) => (
				<span className="text-sm text-slate-500 whitespace-nowrap">
					{row.createdAt}
				</span>
			),
		},
		{
			key: 'actions',
			header: t('table.actions'),
			cell: (row) => (
				<ActionButtons
					row={row.raw}
					actions={[
						{
							icon: <UsersIcon />,
							tooltip: t('btn.assign'),
							variant: 'blue',
							onClick: r => setAssignPlanOpen(r),
						},
						{
							icon: <Eye />,
							tooltip: t('btn.preview'),
							variant: 'slate',
							onClick: r => onViewDetails(r),
						},
						{
							icon: <Copy />,
							tooltip: t('btn.duplicate'),
							variant: 'purple',
							onClick: r => onDuplicate(r),
						},
						{
							icon: <PencilLine />,
							tooltip: t('btn.edit'),
							variant: 'amber',
							hidden: row.raw?.adminId == null,
							onClick: async r => {
								try {
									const { data } = await api.get(`/nutrition/meal-plans/${r.id}`);
									setEditPlan(data);
								} catch (e) {
									Notification(e?.response?.data?.message || t('toast.load_failed'), 'error');
								}
							},
						},
						{
							icon: <Trash2 />,
							tooltip: t('btn.delete'),
							variant: 'red',
							hidden: row.raw?.adminId == null,
							onClick: r => {
								setDeletePlanId(r.id);
								setDeleteOpen(true);
							},
						},
					]}
				/>
			),
		},
	];


	const tableActions = [
		{
			key: 'sort-created-at',
			label: sortBy === 'created_at'
				? (sortOrder === 'ASC' ? t('search.oldest_first') : t('search.newest_first'))
				: t('search.sort_by_date'),
			icon: sortOrder === 'ASC'
				? <ChevronDown size={14} className="rotate-180" />
				: <ChevronDown size={14} />,
			onClick: () => toggleSort('created_at'),
		},
	];

	return (
		<div className="space-y-6">
			<GradientStatsHeader
				onClick={() => setAddPlanOpen(true)}
				btnName={t('btn.new_plan')}
				title={t('ui.title')}
				desc={t('ui.subtitle')}
				loadingStats={loadingStats}
			>
				<StatCard icon={Target} title={t('stats.global_plans')} value={stats?.totals?.globalPlansCount} />
				<StatCard icon={TrendingUp} title={t('stats.my_plans')} value={stats?.totals?.myPlansCount} />
			</GradientStatsHeader>


			<DataTable
				columns={tableColumns}
				data={tableRows}
				isLoading={listLoading}
				searchValue={searchText}
				onSearchChange={(value) => {
					setSearchText(value);
					setPage(1);
				}}
				onSearch={() => setPage(1)}
				actions={tableActions}
				labels={{
					searchPlaceholder: t('search.placeholder'),
					emptyTitle: t('list.empty_title'),
					emptySubtitle: t('list.empty_desc'),
				}}
				pagination={{
					current_page: page,
					per_page: perPage,
					total_records: total,
				}}
				onPageChange={({ page: nextPage, per_page }) => {
					setPage(Number(nextPage ?? 1));
					setPerPage(Number(per_page ?? 10));
				}}
				perPageOptions={[10, 20, 30, 50]}
				rowKey={(row) => row.id}
				hoverable
			/>


			{/* Modals */}
			<Modal open={addPlanOpen} maxH="h-fit" cn="!py-0" onClose={() => setAddPlanOpen(false)} title={t('modals.create_title')} scrollRef={scrollRef}>
				<MealPlanForm scrollRef={scrollRef} onSubmitPayload={onCreate} submitLabel="btn.create" />
			</Modal>

			<Modal
				scrollRef={scrollRef}
				open={!!editPlan}
				onClose={() => { clearPlanIdFromUrl(); setEditPlan(null); }}
				title={editPlan ? (editPlan.id ? `${t('modals.edit_title')}: ${editPlan.name}` : `${t('btn.duplicate')}: ${editPlan.name}`) : ''}
			>
				{editPlan && (
					<MealPlanForm
						scrollRef={scrollRef}
						initialPlan={editPlan}
						onSubmitPayload={async payload => {
							if (editPlan?.id) await onUpdate(editPlan.id, payload);
							else { await onCreate(payload); setEditPlan(null); }
						}}
						submitLabel={editPlan?.id ? 'btn.update' : 'btn.create'}
					/>
				)}
			</Modal>

			<Modal maxW="max-w-[480px]" open={!!assignPlanOpen} onClose={() => setAssignPlanOpen(null)} title={assignPlanOpen ? `${t('modals.assign_title')}: ${assignPlanOpen.name}` : ''}>
				{assignPlanOpen && (
					<AssignPlanForm
						onClose={() => setAssignPlanOpen(null)}
						plan={assignPlanOpen}
						clients={optionsClient}
						onAssign={(userId, setSubmitting) => onAssign(assignPlanOpen.id, userId, setSubmitting)}
					/>
				)}
			</Modal>

			<Modal open={detailsOpen} onClose={() => setDetailsOpen(false)} title={selectedPlan ? `${t('modals.details_title')}: ${selectedPlan.name}` : t('modals.details_title')}>
				<div className="rounded-lg bg-slate-50/60 p-3 sm:p-4">
					{selectedPlan && <PlanDetailsView plan={selectedPlan} />}
				</div>
			</Modal>

			<ConfirmDialog
				loading={deleteLoading}
				open={deleteOpen}
				onClose={() => { setDeleteOpen(false); setDeletePlanId(null); }}
				title={t('confirm.delete_title')}
				message={t('confirm.delete_msg')}
				confirmText={t('btn.delete')}
				onConfirm={onDelete}
			/>
		</div>
	);
}

/* ─────────────────── ReorderFieldArray ─────────────────── */
export function ReorderFieldArray({ control, name, renderRow, className = 'space-y-2' }) {
	const { fields, replace } = useFieldArray({ control, name });
	if (!fields?.length) return null;

	return (
		<Reorder.Group axis="y" values={fields} onReorder={newOrder => replace(newOrder)} className={className}>
			{fields.map((row, idx) => (
				<Reorder.Item key={row.id || idx} value={row} dragListener className="rounded-lg border border-slate-200 bg-white p-2">
					<div className="flex items-start gap-2">
						<GripVertical className="w-4 h-4 mt-2 shrink-0 cursor-grab text-slate-300 hover:text-slate-400 transition" />
						<div className="flex-1">{renderRow({ row, index: idx })}</div>
					</div>
				</Reorder.Item>
			))}
		</Reorder.Group>
	);
}

/* ─────────────────── MealPlanForm ─────────────────── */
export function MealPlanForm({ scrollRef, initialPlan, onSubmitPayload, submitLabel = 'btn.save' }) {
	const t = useTranslations('nutrition');
	const { baseFormSchema } = buildSchemas(t);

	const defaultMeals = [{ title: t('form.meal_name'), time: '', items: [blankItem()], supplements: [] }];

	const initialFormValues = useMemo(() => {
		if (!initialPlan) {
			return {
				name: '', description: '',
				notes: (DEFAULT_NOTES || []).join('\n'),
				notesList: DEFAULT_NOTES.length ? DEFAULT_NOTES : [''],
				baseMeals: defaultMeals,
				customizeDays: false,
				dayOverrides: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
			};
		}

		const firstDayMeals =
			(initialPlan.days?.[0]?.meals?.length ? initialPlan.days[0].meals : mapFoodsToMeals(initialPlan.days?.[0]?.foods)) || defaultMeals;
		const existingNotes = String(initialPlan.notes || '').split('\n').filter(Boolean);

		return {
			name: initialPlan.name || '',
			description: initialPlan.desc || '',
			notes: initialPlan.notes || '',
			notesList: existingNotes.length ? existingNotes : [''],
			baseMeals: cloneMealsStrict(firstDayMeals),
			customizeDays: false,
			dayOverrides: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
		};
	}, [initialPlan, t]);

	const { control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
		resolver: yupResolver(baseFormSchema),
		defaultValues: initialFormValues,
		mode: 'onBlur',
	});

	const customizeDays = watch('customizeDays');
	const { fields: baseMeals, append: appendMeal, remove: removeMeal, replace: replaceMeals } = useFieldArray({ control, name: 'baseMeals' });

	const [aiOpen, setAiOpen] = useState(false);
	const locale = useLocale();
	const [aiText, setAiText] = useState(
		locale === 'ar'
			? 'أنشئ خطة وجبات لإعادة تكوين الجسم تحتوي على 2300 سعرة حرارية و5 وجبات يوميًا.'
			: 'Create a 2300 calorie recomposition meal plan with 5 meals per day.'
	);
	const [aiLoading, setAiLoading] = useState(false);

	const onSubmit = async (data) => {
		const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
		const baseMealsPayload = mealsToServerMealsStrict(data.baseMeals);
		const dayOverrides = {};
		dayKeys.forEach(k => {
			const overrideMeals = data?.dayOverrides?.[k] || [];
			if (Array.isArray(overrideMeals) && overrideMeals.length > 0 && data.customizeDays) {
				dayOverrides[k] = { day: k, meals: mealsToServerMealsStrict(overrideMeals), supplements: [] };
			}
		});
		const payload = {
			name: data.name, description: data.description || '',
			notes: (data.notesList || []).filter(Boolean).join('\n'),
			baseMeals: baseMealsPayload, customizeDays: !!data.customizeDays,
			dayOverrides: Object.keys(dayOverrides).length ? dayOverrides : undefined,
		};
		await onSubmitPayload(payload);
	};

	function normalizeAiResponse(raw) {
		if (raw && typeof raw === 'object' && (raw.meals || raw.name)) return raw;
		const maybeContent = raw?.content ?? raw?.choices?.[0]?.message?.content ?? raw;
		if (maybeContent && typeof maybeContent === 'object' && (maybeContent.meals || maybeContent.name)) return maybeContent;
		if (typeof maybeContent === 'string') {
			const text = safeJsonFromCodeFence(maybeContent.trim());
			try { const parsed = JSON.parse(text); if (parsed && typeof parsed === 'object') return parsed; } catch { }
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
				title: m?.title || t('form.meal_name'), time: m?.time || '',
				items: (m?.items || []).map(it => ({
					name: String(it?.name || '').trim(),
					quantity: it?.quantity === '' || it?.quantity === null || typeof it?.quantity === 'undefined' ? null : Number(it.quantity) || null,
					calories: Number(it?.calories) || 0,
					unit: it?.unit === 'count' ? 'count' : 'g',
				})),
				supplements: (m?.supplements || []).map(s => ({ name: String(s?.name || '').trim(), time: s?.time ? String(s.time) : '', bestWith: s?.bestWith ? String(s.bestWith) : '' })),
			}));
			if (!safeMeals.length) throw new Error('AI returned no meals.');
			setValue('baseMeals', safeMeals, { shouldValidate: true, shouldDirty: true });
			if (parsed?.name) setValue('name', String(parsed.name), { shouldDirty: true });
			if (parsed?.description) setValue('description', String(parsed.description), { shouldDirty: true });
			if (Array.isArray(parsed?.notes)) {
				const arr = parsed.notes.map(String).filter(Boolean);
				setValue('notesList', arr.length ? arr : [''], { shouldDirty: true });
			} else if (typeof parsed?.notes === 'string') {
				const lines = parsed.notes.split('\n').map(s => s.trim()).filter(Boolean);
				setValue('notesList', lines.length ? lines : [''], { shouldDirty: true });
			}
			Notification(t('toast.ai_filled'), 'success');
			setAiOpen(false); setAiText('');
		} catch (e) { Notification(e?.message || t('toast.ai_failed'), 'error'); } finally { setAiLoading(false); }
	};

	return (
		<form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
			<div className="grid grid-cols-2 max-md:grid-cols-1 gap-3">
				<Controller name="name" control={control} render={({ field }) => <Input placeholder={t('form.plan_name')} name="name" value={field.value} onChange={field.onChange} required error={errors?.name?.message} />} />
				<Controller name="description" control={control} render={({ field }) => <Input placeholder={t('form.description')} name="description" value={field.value} onChange={field.onChange} error={errors?.description?.message} />} />
			</div>

			<Controller name="notesList" control={control} render={({ field }) => <NotesListInput value={Array.isArray(field.value) && field.value.length ? field.value : ['']} onChange={field.onChange} />} />

			{/* Meals section */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<h4 className="text-sm font-semibold text-slate-800">{t('form.base_day_title')}</h4>
						<Clock size={14} className="text-slate-400" />
					</div>
					<CButton
						name="btn.add_meal"
						size="sm"
						icon={<Plus size={13} />}
						onClick={() => {
							appendMeal({ title: `${t('form.meal_name')} ${baseMeals.length + 1}`, time: '', items: [blankItem()], supplements: [] });
							setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, 0);
						}}
						variant="outline"
					/>
				</div>

				{baseMeals?.length ? (
					<Reorder.Group axis="y" values={baseMeals} onReorder={newOrder => replaceMeals(newOrder)} className="space-y-2">
						{baseMeals.map((m, mealIndex) => (
							<Reorder.Item key={m.id || mealIndex} value={m} dragListener className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs">
								{/* Meal header */}
								<div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-3 py-2.5">
									<GripVertical className="w-4 h-4 shrink-0 cursor-grab text-slate-300 hover:text-slate-400 transition" />
									<Controller
										name={`baseMeals.${mealIndex}.title`}
										control={control}
										render={({ field }) => (
											<Input
												className="max-w-[240px]"
												placeholder={t('form.meal_name')}
												value={field.value}
												onChange={field.onChange}
												required
												error={getErr(errors, `baseMeals.${mealIndex}.title`)}
											/>
										)}
									/>
									<Controller
										name={`baseMeals.${mealIndex}.time`}
										control={control}
										render={({ field }) => (
											<TimeField
												className="!w-[160px]"
												showLabel={false}
												value={field.value || ''}
												onChange={field.onChange}
												error={getErr(errors, `baseMeals.${mealIndex}.time`)}
											/>
										)}
									/>
									<div className="ml-auto">
										<DangerX onClick={() => removeMeal(mealIndex)} title={t('btn.remove_meal')} size="sm" />
									</div>
								</div>

								<div className="px-3 py-3">
									<MealBlocks ctx={{ control, basePath: `baseMeals.${mealIndex}`, errors, setValue }} />
								</div>
							</Reorder.Item>
						))}
					</Reorder.Group>
				) : (
					<div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
						<UtensilsCrossed className="w-8 h-8 text-slate-300 mx-auto mb-2" />
						<p className="text-sm text-slate-400">{t('empty.no_meals_hint')}</p>
					</div>
				)}

				{errors?.baseMeals?.message && <p className="text-xs text-rose-600">{errors.baseMeals.message}</p>}
			</div>

			<Controller name="customizeDays" control={control} render={({ field }) => (
				<CheckBox id="customizeDays" label={t('form.customize_days')} initialChecked={!!field.value} onChange={field.onChange} />
			)} />

			{customizeDays && <DayOverrides control={control} errors={errors} setValue={setValue} />}

			{/* AI panel */}
			<AnimatePresence>
				{aiOpen && (
					<motion.div
						initial={{ opacity: 0, y: -8, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -8, scale: 0.98 }}
						transition={{ duration: 0.2 }}
						className="rounded-lg border border-[color:var(--color-primary-200)] bg-[color:var(--color-primary-50)] p-4 space-y-3"
					>
						<div className="flex items-center gap-2 mb-1">
							<Sparkles size={14} className="text-[color:var(--color-primary-600)]" />
							<span className="text-xs font-semibold text-[color:var(--color-primary-700)]">AI Meal Plan Generator</span>
						</div>
						<textarea
							rows={3}
							className="w-full bg-white rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary-300)] focus:border-[color:var(--color-primary-400)] resize-none placeholder:text-slate-400 transition"
							placeholder="e.g., 2300 kcal recomposition, 5 meals, add multivitamin after Meal 1…"
							value={aiText}
							onChange={e => setAiText(e.target.value)}
						/>
						<div className="flex items-center justify-end gap-2">
							<CButton type="button" onClick={() => setAiOpen(false)} name="btn.cancel" variant="outline" size="sm" />
							<CButton name="btn.generate" onClick={runAiFill} loading={aiLoading} variant="primary" size="sm" icon={<Sparkles size={13} />} />
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Footer */}
			<div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-100">
				<CButton type="button" onClick={() => setAiOpen(o => !o)} icon={<Sparkles size={14} />} name="btn.ai_assist" variant="outline" size="sm" />
				<CButton name={submitLabel} type="submit" variant="primary" loading={isSubmitting} />
			</div>
		</form>
	);
}

function buildAiPrompt(userText) {
	return `Return ONLY valid JSON matching exactly:
{"name":"Plan Name","description":"Short description","notes":["bullet 1"],"meals":[{"title":"Meal 1","time":"08:00","items":[{"name":"Oats","quantity":80,"calories":320,"unit":"g"}],"supplements":[{"name":"Multivitamin","time":"08:30","bestWith":"water"}]}]}
Rules: 24h HH:MM for time (or empty string). Items ONLY: name, quantity, calories, unit ("g"|"count"). Return VALID JSON without markdown fences.
User description: ${userText}`;
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

/* ─────────────────── MealBlocks ─────────────────── */
const MealBlocks = memo(function MealBlocks({ ctx }) {
	const t = useTranslations('nutrition');
	const { control, basePath, errors, setValue } = ctx;

	const { fields: itemFields, append: appendItem, remove: removeItem, move: moveItem } = useFieldArray({ control, name: `${basePath}.items` });
	const { fields: supFields, append: appendSup, remove: removeSup, move: moveSup } = useFieldArray({ control, name: `${basePath}.supplements` });
	const watchedItems = useWatch({ control, name: `${basePath}.items` });

	return (
		<div className="space-y-3">
			{/* Items */}
			{itemFields.length > 0 && (
				<div className="space-y-2">
					{itemFields.map((f, idx) => {
						const ex = watchedItems?.[idx];
						return (
							<DraggableCard key={f.id || idx} index={idx} onMove={(from, to) => moveItem(from, to)}>
								<div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2 hover:border-slate-300 transition">
									<div className="flex items-center gap-2">
										<GripDots />
										<div className="grid grid-cols-2 md:grid-cols-[1fr_110px_88px_110px] gap-2 flex-1">
											<Controller name={`${basePath}.items.${idx}.name`} control={control} render={({ field }) => (
												<MiniField
													placeholder={t('form.item_name')}
													value={field.value}
													onChange={e => {
														const v = e?.target?.value ?? '';
														field.onChange(v);
														const lower = String(v).trim().toLowerCase();
														if (lower.includes('egg') || lower.includes('eggs')) {
															setValue?.(`${basePath}.items.${idx}.unit`, 'count', { shouldDirty: true });
														}
													}}
													onBlur={field.onBlur}
												/>
											)} />
											<Controller name={`${basePath}.items.${idx}.quantity`} control={control} render={({ field }) => (
												<MiniField placeholder={t('form.qty')} value={field.value == null ? '' : field.value} onChange={e => field.onChange(asNumber(e.target.value))} onBlur={field.onBlur} inputMode="decimal" />
											)} />
											<Controller name={`${basePath}.items.${idx}.unit`} control={control} render={({ field }) => (
												<UnitSelect value={field.value || 'g'} onChange={v => field.onChange(v)} />
											)} />
											<Controller name={`${basePath}.items.${idx}.calories`} control={control} render={({ field }) => (
												<MiniField placeholder={t('form.calories')} value={field.value == 0 ? '' : field.value} onChange={e => field.onChange(asNumber(e.target.value))} onBlur={field.onBlur} inputMode="decimal" />
											)} />
										</div>
										<div className="flex items-center gap-1 shrink-0">
											<button
												type="button"
												title={t('form.add_alternative', { default: 'Add alternative' })}
												onClick={() => setValue?.(`${basePath}.items.${idx}.alternative`, ex?.alternative ? null : blankAlternative(), { shouldDirty: true })}
												className={[
													'h-8 w-8 inline-flex items-center justify-center rounded-lg border transition',
													ex?.alternative
														? 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100'
														: 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100',
												].join(' ')}
											>
												<Replace className="w-3.5 h-3.5" />
											</button>
											<DangerX size="sm" onClick={() => removeItem(idx)} title={t('btn.remove_meal')} />
										</div>
									</div>

									{/* Alternative row */}
									{ex?.alternative && (
										<motion.div
											initial={{ opacity: 0, height: 0 }}
											animate={{ opacity: 1, height: 'auto' }}
											exit={{ opacity: 0, height: 0 }}
											className="ml-5 rounded-lg border-l-2 border-amber-300 bg-amber-50/60 p-2.5 space-y-2"
										>
											<div className="flex items-center justify-between">
												<span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide">{t('form.alternative_item', { default: 'Alternative' })}</span>
												<button type="button" onClick={() => setValue?.(`${basePath}.items.${idx}.alternative`, null, { shouldDirty: true })} className="text-[10px] text-amber-600 hover:text-amber-900 underline transition">
													{t('btn.remove_alternative', { default: 'Remove' })}
												</button>
											</div>
											<div className="grid grid-cols-2 md:grid-cols-[1fr_110px_88px_110px] gap-2">
												<Controller name={`${basePath}.items.${idx}.alternative.name`} control={control} render={({ field }) => <MiniField placeholder={t('form.item_name')} value={field.value} onChange={e => field.onChange(e.target.value)} onBlur={field.onBlur} />} />
												<Controller name={`${basePath}.items.${idx}.alternative.quantity`} control={control} render={({ field }) => <MiniField placeholder={t('form.qty')} value={field.value == null ? '' : field.value} onChange={e => field.onChange(asNumber(e.target.value))} onBlur={field.onBlur} inputMode="decimal" />} />
												<Controller name={`${basePath}.items.${idx}.alternative.unit`} control={control} render={({ field }) => <UnitSelect value={field.value || 'g'} onChange={v => field.onChange(v)} />} />
												<Controller name={`${basePath}.items.${idx}.alternative.calories`} control={control} render={({ field }) => <MiniField placeholder={t('form.calories')} value={field.value == 0 ? '' : field.value} onChange={e => field.onChange(asNumber(e.target.value))} onBlur={field.onBlur} inputMode="decimal" />} />
											</div>
										</motion.div>
									)}

									{getErr(errors, `${basePath}.items.${idx}.name`) && <p className="text-xs text-rose-600 pl-6">{getErr(errors, `${basePath}.items.${idx}.name`)}</p>}
									{getErr(errors, `${basePath}.items.${idx}.calories`) && <p className="text-xs text-rose-600 pl-6">{getErr(errors, `${basePath}.items.${idx}.calories`)}</p>}
								</div>
							</DraggableCard>
						);
					})}
				</div>
			)}

			{/* Supplements */}
			{supFields.length > 0 && (
				<div className="space-y-2">
					<p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-1">{t('btn.add_supplement')}</p>
					{supFields.map((f, idx) => (
						<DraggableCard key={f.id || idx} index={idx} onMove={(from, to) => moveSup(from, to)}>
							<div className="rounded-lg border border-slate-200 bg-white p-2.5 hover:border-slate-300 transition">
								<div className="flex items-center gap-2">
									<GripDots />
									<div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1">
										<Controller name={`${basePath}.supplements.${idx}.name`} control={control} render={({ field }) => <Input placeholder={t('form.supplement_name')} value={field.value} onChange={field.onChange} error={getErr(errors, `${basePath}.supplements.${idx}.name`)} />} />
										<Controller name={`${basePath}.supplements.${idx}.time`} control={control} render={({ field }) => <TimeField showLabel={false} value={field.value || ''} onChange={field.onChange} error={getErr(errors, `${basePath}.supplements.${idx}.time`)} />} />
										<Controller name={`${basePath}.supplements.${idx}.bestWith`} control={control} render={({ field }) => <Input placeholder={t('form.best_with')} value={field.value || ''} onChange={field.onChange} />} />
									</div>
									<DangerX size="sm" onClick={() => removeSup(idx)} title={t('btn.delete')} />
								</div>
							</div>
						</DraggableCard>
					))}
				</div>
			)}

			<div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
				<CButton name="btn.add_item" size="sm" icon={<Plus size={12} />} onClick={() => appendItem(blankItem())} variant="outline" />
				<CButton name="btn.add_supplement" size="sm" icon={<Pill size={12} />} onClick={() => appendSup(blankSupplement())} variant="outline" />
			</div>
		</div>
	);
});

/* ─────────────────── NotesListInput ─────────────────── */
export function NotesListInput({ value = [''], onChange }) {
	const t = useTranslations('nutrition');
	const refs = useRef([]);
	const list = Array.isArray(value) && value.length ? value : [''];

	const addAfter = i => {
		const next = [...list];
		next.splice(i + 1, 0, '');
		onChange(next);
		requestAnimationFrame(() => refs.current[i + 1]?.focus());
	};

	const removeAt = i => {
		const next = [...list];
		next.splice(i, 1);
		onChange(next.length ? next : ['']);
		requestAnimationFrame(() => refs.current[Math.max(0, i - 1)]?.focus());
	};

	return (
		<div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 space-y-1.5">
			{list.map((line, i) => (
				<div key={i} className="flex items-center gap-2.5 group">
					<span className="w-3.5 text-[color:var(--color-primary-400)] text-[10px] shrink-0 select-none">●</span>
					<input
						ref={el => (refs.current[i] = el)}
						className="flex-1 text-sm text-slate-800 outline-none placeholder:text-slate-400 bg-transparent border-b border-transparent focus:border-[color:var(--color-primary-300)] transition py-0.5"
						value={line}
						onChange={e => { const next = [...list]; next[i] = e.target.value; onChange(next); }}
						onKeyDown={e => {
							if (e.key === 'Enter') { e.preventDefault(); addAfter(i); }
							if (e.key === 'Backspace' && !line) { e.preventDefault(); removeAt(i); }
						}}
						placeholder={t('notes.placeholder')}
					/>
				</div>
			))}
		</div>
	);
}

/* ─────────────────── DayOverrides ─────────────────── */
function DayOverrides({ control, errors, setValue }) {
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
			<div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
				<button
					type="button"
					onClick={() => onToggle(dayKey)}
					className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition"
				>
					<div className="flex items-center gap-2">
						<Calendar size={13} className="text-slate-400" />
						<span className="text-sm font-medium text-slate-800">{label}</span>
					</div>
					<span className="flex items-center gap-2 text-xs text-slate-500">
						{fields.length > 0 && <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5">{fields.length} {t('details.meals')}</span>}
						<ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
					</span>
				</button>

				{isOpen && (
					<div className="p-3 space-y-3 bg-slate-50/60 border-t border-slate-100">
						<div className="flex justify-end">
							<CButton name="btn.add_meal" icon={<Plus size={12} />} onClick={e => { e.stopPropagation(); append({ title: `${t('form.meal_name')} ${fields.length + 1}`, time: '', items: [blankItem()], supplements: [] }); onEnsureOpen(dayKey); }} variant="outline" size="sm" />
						</div>

						<div className="space-y-2">
							{fields.map((m, mi) => (
								<DraggableCard key={m.id || mi} index={mi} onMove={(from, to) => move(from, to)}>
									<div className="rounded-lg border border-slate-200 bg-white p-3">
										<div className="flex items-center gap-2 justify-between mb-3">
											<div className="flex items-center gap-2">
												<GripDots />
												<span className="text-xs font-medium text-slate-600">{t('form.meal_name')} {mi + 1}</span>
											</div>
											<DangerX onClick={() => remove(mi)} title={t('btn.remove_meal')} size="sm" />
										</div>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
											<Controller name={`${basePath}.${mi}.title`} control={control} render={({ field }) => <Input placeholder={t('form.meal_name')} value={field.value} onChange={field.onChange} required error={getErr(errors, `${basePath}.${mi}.title`)} />} />
											<Controller name={`${basePath}.${mi}.time`} control={control} render={({ field }) => <TimeField showLabel={false} value={field.value || ''} onChange={field.onChange} error={getErr(errors, `${basePath}.${mi}.time`)} />} />
										</div>
										<MealBlocks ctx={{ control, basePath: `${basePath}.${mi}`, errors, setValue }} />
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
		<div className="space-y-3">
			<h4 className="text-sm font-semibold text-slate-800">{t('form.customize_days')}</h4>
			<div className="space-y-2">
				{days.map(d => (
					<DayOverrideBlock key={d.key} control={control} basePath={`dayOverrides.${d.key}`} label={d.label} errors={errors} dayKey={d.key} isOpen={!!openDays[d.key]} onToggle={toggle} onEnsureOpen={ensureOpen} />
				))}
			</div>
		</div>
	);
}

/* ─────────────────── PlanDetailsView ─────────────────── */
export function PlanDetailsView({ plan }) {
	const t = useTranslations('nutrition');
	const [open, setOpen] = useState({});
	const toggle = key => setOpen(p => ({ ...p, [key]: !p[key] }));
	const mapFoodsToMealsLocal = (foods = []) => [{ title: t('form.meal_name'), items: foods }];
	const spring = { type: 'spring', stiffness: 300, damping: 30, mass: 0.7 };
	const sumCalories = (meals) => { let total = 0; (meals || []).forEach(m => (m.items || []).forEach(it => (total += Number(it.calories || 0)))); return total; };

	return (
		<div className="space-y-4">
			{!!plan?.desc && <p className="text-sm text-slate-700">{plan.desc}</p>}

			{!!plan?.notes && (
				<div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
					<p className="text-xs font-semibold text-amber-800 mb-1">{t('details.notes')}</p>
					<pre className="whitespace-pre-wrap text-xs leading-6 text-amber-900">{plan.notes}</pre>
				</div>
			)}

			<div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs">
				{plan?.days?.map((d, idx) => {
					const dayKey = d.day || `day-${idx}`;
					const meals = d.meals || mapFoodsToMealsLocal(d.foods || []);
					const isOpen = !!open[dayKey];
					const totals = sumCalories(meals);

					return (
						<div key={dayKey} className="border-b border-slate-100 last:border-b-0">
							<button
								type="button"
								onClick={() => toggle(dayKey)}
								className="group flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 transition"
							>
								<div className="flex items-center gap-2">
									<motion.span initial={false} animate={{ rotate: isOpen ? 180 : 0 }} transition={spring}>
										<ChevronDown size={15} className="text-slate-500" />
									</motion.span>
									<span className="text-sm font-medium text-slate-800">{t(d.name?.toLowerCase())}</span>
								</div>
								<div className="flex items-center gap-2 text-xs">
									<span className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-slate-600 font-medium">
										{meals.length} {t('details.meals')}
									</span>
									<span className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--color-primary-200)] bg-[color:var(--color-primary-50)] px-2 py-0.5 text-[color:var(--color-primary-700)] font-semibold">
										<ChefHat size={11} />
										{totals} {t('details.kcal')}
									</span>
								</div>
							</button>

							<AnimatePresence initial={false}>
								{isOpen && (
									<motion.div
										key="content"
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: 'auto', opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
										className="overflow-hidden"
									>
										<div className="space-y-2 bg-slate-50/60 px-4 pb-3 pt-1">
											{meals.map((m, mi) => {
												const mealCals = (m.items || []).reduce((a, b) => a + Number(b.calories || 0), 0);
												return (
													<motion.div key={mi} layout initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
														<div className="flex items-center justify-between mb-2">
															<div className="flex items-center gap-2">
																<UtensilsCrossed size={13} className="text-[color:var(--color-primary-500)]" />
																<span className="text-sm font-semibold text-slate-800">{m.title || `${t('form.meal_name')} ${mi + 1}`}</span>
																<span className="text-[11px] text-slate-400">~ {mealCals} {t('details.kcal')}</span>
															</div>
															{m.time && (
																<span className="flex items-center gap-1 text-xs text-slate-500">
																	<Clock size={11} /> {m.time}
																</span>
															)}
														</div>

														{m.items?.length > 0 && (
															<div className="overflow-x-auto">
																<table className="w-full text-xs">
																	<thead>
																		<tr className="text-slate-400 border-b border-slate-100">
																			<th className="py-1.5 pr-3 rtl:text-right ltr:text-left font-medium">{t('table.item')}</th>
																			<th className="py-1.5 pr-3 rtl:text-right ltr:text-left font-medium">{t('table.qty_g')}</th>
																			<th className="py-1.5 pr-3 rtl:text-right ltr:text-left font-medium">Unit</th>
																			<th className="py-1.5 rtl:text-right ltr:text-left font-medium">{t('table.calories')}</th>
																		</tr>
																	</thead>
																	<tbody>
																		{m.items.map((it, ii) => (
																			<React.Fragment key={ii}>
																				<tr className="border-b border-slate-50">
																					<td className="py-1.5 pr-3 text-slate-800 font-medium">{it.name}</td>
																					<td className="py-1.5 pr-3 text-slate-600">{it.quantity ?? '—'}</td>
																					<td className="py-1.5 pr-3 text-slate-500">{it.unit || 'g'}</td>
																					<td className="py-1.5 text-slate-600 font-medium">{it.calories}</td>
																				</tr>
																				{it.alternativeName != null && String(it.alternativeName || '').trim() && (
																					<tr className="border-b border-amber-50 bg-amber-50/40">
																						<td className="py-1 pr-3 text-amber-700 text-[10px]">↳ {t('form.alternative_item', { default: 'Alt' })}: {it.alternativeName}</td>
																						<td className="py-1 pr-3 text-amber-600 text-[10px]">{it.alternativeQuantity ?? '—'}</td>
																						<td className="py-1 pr-3 text-amber-500 text-[10px]">{it.alternativeUnit || 'g'}</td>
																						<td className="py-1 text-amber-600 text-[10px]">{it.alternativeCalories ?? '—'}</td>
																					</tr>
																				)}
																			</React.Fragment>
																		))}
																	</tbody>
																</table>
															</div>
														)}
													</motion.div>
												);
											})}
										</div>
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

/* ─────────────────── AssignPlanForm ─────────────────── */
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
		<form onSubmit={submit} className="space-y-5">
			<div className="space-y-2">
				<label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
					{t('modals.assign_select_client') ?? 'Select client'}
				</label>
				<Select value={userId} onValueChange={setUserId}>
					<SelectTrigger className="h-10 w-full rounded-lg border border-slate-200 bg-white text-sm">
						<SelectValue placeholder={t('modals.assign_placeholder') ?? 'Choose a client'} />
					</SelectTrigger>
					<SelectContent>
						{(clients || []).length ? (
							clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.label}</SelectItem>)
						) : (
							<SelectItem value="__empty" disabled>{t('list.no_clients') ?? 'No clients found'}</SelectItem>
						)}
					</SelectContent>
				</Select>
			</div>

			<div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
				<button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
					{t('btn.cancel')}
				</button>
				<Button disabled={!userId || userId === '__empty'} loading={submitting} type="submit" color="primary" name={submitting ? t('btn.assigning') : t('btn.assign_plan')} className="!h-9 !w-fit" />
			</div>
		</form>
	);
}

/* ─────────────────── PlanListView ─────────────────── */
export const PlanListView = memo(function PlanListView({ loading, plans = [], onPreview, onEdit, onDuplicate, onDelete, onAssign }) {
	const t = useTranslations('nutrition');
	const user = useUser();

	if (loading) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 5 }).map((_, i) => (
					<div key={i} className="flex items-center gap-4 rounded-lg border border-slate-100 bg-white px-5 py-4">
						<div className="h-10 w-10 rounded-lg bg-slate-100 shimmer shrink-0" />
						<div className="flex-1 space-y-2">
							<div className="h-3.5 w-44 rounded-full bg-slate-100 shimmer" />
							<div className="h-2.5 w-64 rounded-full bg-slate-100 shimmer" />
						</div>
						<div className="h-8 w-32 rounded-lg bg-slate-100 shimmer" />
					</div>
				))}
			</div>
		);
	}

	if (!plans.length) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 py-16">
				<div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100">
					<UtensilsCrossed className="h-7 w-7 text-slate-400" />
				</div>
				<div className="text-center space-y-1">
					<h3 className="text-base font-semibold text-slate-800">{t('list.empty_title')}</h3>
					<p className="text-sm text-slate-500 max-w-xs">{t('list.empty_desc')}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{plans.map((p, idx) => (
				<motion.div
					key={p.id}
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: idx * 0.04, duration: 0.22 }}
					className="group relative bg-card flex items-center gap-4 rounded-lg border border-slate-100 bg-white px-5 py-3.5 shadow-xs hover:shadow-sm hover:border-slate-200 transition-all duration-200"
				>
					{/* Accent line */}
					<span aria-hidden className="absolute left-0 top-0 h-full w-1 rounded-l-2xl theme-gradient-bg opacity-70" />

					{/* Icon */}
					<div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg theme-gradient-bg text-white shadow-sm">
						<UtensilsCrossed className="h-5 w-5" />
					</div>

					{/* Text */}
					<div className="min-w-0 flex-1 pl-1">
						<MultiLangText className="truncate text-sm font-semibold text-slate-900 leading-snug">{p.name}</MultiLangText>
						{p.desc || p.notes ? (
							<MultiLangText className="line-clamp-1 text-xs leading-5 text-slate-500 mt-0.5">{p.desc ?? p.notes}</MultiLangText>
						) : (
							<p className="text-xs text-slate-400 mt-0.5">{t('list.no_desc')}</p>
						)}
					</div>

					<ActionButtons
						row={p}
						actions={[
							{
								icon: <UsersIcon />,
								tooltip: t('btn.assign'),
								variant: 'blue',
								onClick: row => onAssign?.(row),
							},
							{
								icon: <Eye />,
								tooltip: t('btn.preview'),
								variant: 'slate',
								onClick: row => onPreview?.(row),
							},
							{
								icon: <Copy />,
								tooltip: t('btn.duplicate'),
								variant: 'purple',
								onClick: row => onDuplicate?.(row),
							},
							{
								icon: <PencilLine />,
								tooltip: t('btn.edit'),
								variant: 'amber',
								hidden: p?.adminId == null,
								onClick: row => onEdit?.(row),
							},
							{
								icon: <Trash2 />,
								tooltip: t('btn.delete'),
								variant: 'red',
								hidden: p?.adminId == null,
								onClick: row => onDelete?.(row.id),
							},
						]}
					/>
				</motion.div>
			))}
		</div>
	);
});

/* ─────────────────── ConfirmDialog ─────────────────── */
function ConfirmDialog({ loading, open, onClose, title, message, confirmText, onConfirm }) {
	const t = useTranslations('nutrition');
	if (!open) return null;
	return (
		<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
			<motion.div
				initial={{ opacity: 0, scale: 0.96, y: 8 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
			>
				<h3 className="text-base font-semibold text-slate-800 mb-2">{title}</h3>
				<p className="text-sm text-slate-500 mb-5 leading-relaxed">{message}</p>
				<div className="flex items-center justify-end gap-2">
					<button type="button" onClick={onClose} disabled={loading} className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
						{t('btn.cancel')}
					</button>
					<CButton onClick={onConfirm} disabled={loading} name={loading ? 'btn.deleting' : 'btn.delete'} variant="danger" size="sm" className="!h-9" />
				</div>
			</motion.div>
		</div>
	);
}

/* ─────────────────── DangerX ─────────────────── */
export function DangerX({ onClick, title = 'Remove', size = 'md', loading = false, disabled = false, autoResetMs = 1500, icon: Icon = Trash2 }) {
	const confirmText = useTranslations('nutrition')('btn.delete');
	const t = useTranslations('nutrition');
	const [armed, setArmed] = useState(false);
	const [remaining, setRemaining] = useState(Math.round(autoResetMs / 1000));
	const btnRef = useRef(null);
	const timerRef = useRef(null);
	const intervalRef = useRef(null);

	useEffect(() => {
		if (!armed) return;
		setRemaining(Math.max(1, Math.round(autoResetMs / 1000)));
		intervalRef.current = setInterval(() => setRemaining(r => r > 1 ? r - 1 : r), 1000);
		timerRef.current = setTimeout(() => setArmed(false), autoResetMs);
		return () => { clearTimeout(timerRef.current); clearInterval(intervalRef.current); };
	}, [armed, autoResetMs]);

	useEffect(() => {
		const handleDoc = e => { if (!armed) return; if (btnRef.current && !btnRef.current.contains(e.target)) setArmed(false); };
		document.addEventListener('mousedown', handleDoc);
		return () => document.removeEventListener('mousedown', handleDoc);
	}, [armed]);

	const handleClick = () => {
		if (disabled || loading) return;
		if (armed) { onClick?.(); setArmed(false); return; }
		setArmed(true);
	};

	const sizeStyles = { sm: 'h-8 px-2.5 text-xs', md: 'h-9 px-3 text-sm', lg: 'h-10 px-3.5 text-sm' };
	const iconSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 15;

	return (
		<div className="relative inline-flex" ref={btnRef}>
			<button
				type="button"
				title={title}
				aria-label={title}
				aria-pressed={armed}
				disabled={disabled || loading}
				onClick={handleClick}
				className={[
					'inline-flex items-center gap-1.5 rounded-lg border font-medium transition-all focus-visible:outline-none active:scale-[.97]',
					sizeStyles[size],
					disabled || loading ? 'opacity-60 cursor-not-allowed' : armed
						? 'border-rose-200 bg-rose-50 text-rose-700'
						: 'border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:text-rose-500 hover:bg-rose-50',
				].join(' ')}
			>
				{loading ? (
					<svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
						<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
						<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
					</svg>
				) : armed ? (
					<AlertTriangle size={iconSize} />
				) : (
					<Icon size={iconSize} />
				)}
				{armed && <span className="hidden sm:inline">{confirmText}</span>}
				<AnimatePresence>
					{armed && (
						<motion.span key="count" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] text-rose-500">
							{remaining}s
						</motion.span>
					)}
				</AnimatePresence>
			</button>

			<AnimatePresence>
				{armed && (
					<motion.div
						key="tip"
						initial={{ opacity: 0, y: -4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
						className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] text-rose-700 shadow-md z-10"
					>
						{t('clickAgainToConfirm')}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

/* ─────────────────── DraggableCard ─────────────────── */
function DraggableCard({ children, index, onMove }) {
	const ref = useRef(null);
	const onDragStart = e => {
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', String(index));
	};
	const onDragOver = e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
	const onDrop = e => {
		e.preventDefault();
		const from = Number(e.dataTransfer.getData('text/plain'));
		const to = index;
		if (Number.isFinite(from) && Number.isFinite(to) && from !== to) onMove(from, to);
	};

	return (
		<div ref={ref} draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} className="group/drag">
			{children}
		</div>
	);
}

/* ─────────────────── GripDots ─────────────────── */
function GripDots() {
	return (
		<svg width="22" height="22" viewBox="0 0 24 24" className="text-slate-300 shrink-0 hover:text-slate-400 transition cursor-grab">
			<circle cx="9" cy="7" r="1.5" fill="currentColor" />
			<circle cx="15" cy="7" r="1.5" fill="currentColor" />
			<circle cx="9" cy="12" r="1.5" fill="currentColor" />
			<circle cx="15" cy="12" r="1.5" fill="currentColor" />
			<circle cx="9" cy="17" r="1.5" fill="currentColor" />
			<circle cx="15" cy="17" r="1.5" fill="currentColor" />
		</svg>
	);
}

/* ─────────────────── Helpers ─────────────────── */
function blankItem() { return { name: '', quantity: null, unit: 'g', calories: 0, alternative: null }; }
function blankAlternative() { return { name: '', quantity: null, unit: 'g', calories: 0 }; }
function blankSupplement() { return { name: '', time: '', bestWith: '' }; }

function mapFoodsToMeals(foods = []) {
	if (!foods?.length) return [];
	return [{
		title: 'Meal', time: '',
		items: foods.map(f => ({
			name: f.name,
			quantity: coerceNum(f.quantity, null),
			calories: coerceNum(f.calories),
			unit: f.unit === 'count' ? 'count' : 'g',
			alternative: (f.alternativeName != null && String(f.alternativeName || '').trim())
				? { name: f.alternativeName, quantity: coerceNum(f.alternativeQuantity, null), unit: f.alternativeUnit === 'count' ? 'count' : 'g', calories: coerceNum(f.alternativeCalories) }
				: null,
		})),
		supplements: [],
	}];
}

function coerceNum(v, d = 0) { const n = Number(v); return Number.isFinite(n) ? n : d; }

function sanitizeItem(it) {
	const alt = it?.alternative;
	const hasAlt = alt && String(alt?.name ?? '').trim();
	return {
		name: it?.name ?? '',
		unit: it?.unit === 'count' ? 'count' : 'g',
		quantity: it?.quantity == null || it?.quantity === '' ? null : coerceNum(it.quantity, null),
		calories: coerceNum(it?.calories),
		...(hasAlt ? { alternative: { name: String(alt.name).trim(), quantity: alt.quantity == null || alt.quantity === '' ? null : coerceNum(alt.quantity, null), unit: alt.unit === 'count' ? 'count' : 'g', calories: coerceNum(alt.calories) } } : {}),
	};
}

function sanitizeSupplement(s) { return { name: s?.name ?? '', time: s?.time ? String(s.time) : '', bestWith: s?.bestWith ? String(s.bestWith) : '' }; }

function cloneMealsStrict(meals = []) {
	return (meals || []).map(m => ({
		title: m?.title ?? 'Meal', time: m?.time ? String(m.time) : '',
		items: (m?.items || []).map(it => {
			const base = sanitizeItem(it);
			const alt = it?.alternative;
			const hasAlt = alt && String(alt?.name ?? '').trim();
			if (hasAlt) base.alternative = { name: String(alt.name).trim(), quantity: alt.quantity == null || alt.quantity === '' ? null : coerceNum(alt.quantity, null), unit: alt.unit === 'count' ? 'count' : 'g', calories: coerceNum(alt.calories) };
			else base.alternative = null;
			return base;
		}),
		supplements: (m?.supplements || []).map(sanitizeSupplement),
	}));
}

function mealsToServerMealsStrict(formMeals = []) {
	return formMeals.map(m => ({
		title: m.title, time: m.time ? m.time : null,
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
	} catch { return undefined; }
}