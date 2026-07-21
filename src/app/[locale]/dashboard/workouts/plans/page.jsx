'use client';

import { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import {
	Dumbbell,
	Plus,
	Eye,
	PencilLine,
	Trash2,
	Clock,
	Users as UsersIcon,
	UserPlus,
	X,
	Layers,
	Search,
	Tag,
	GripVertical,
	Loader2,
	Share2,
	CopyPlus,
	ChevronDown,
	ChevronUp,
	BarChart3,
	Calendar,
	Zap,
} from 'lucide-react';

import api from '@/utils/axios';
import { Modal, StatCard } from '@/components/dashboard/ui/UI';
import Button from '@/components/atoms/Button';
import Select from '@/components/atoms/Select';
import { Notification } from '@/config/Notification';
import { PageHeader } from '@/components/molecules/PageHeader';
import { PrettyPagination } from '@/components/dashboard/ui/Pagination';
import Input from '@/components/atoms/Input';
import { ExercisePicker } from '@/components/pages/dashboard/plans/ExercisePicker';
import { useTranslations } from 'next-intl';
import { useAdminClients } from '@/hooks/useHierarchy';
import { useUser } from '@/hooks/useUser';
import MultiLangText from '@/components/atoms/MultiLangText';
import Img from '@/components/atoms/Img';
import { Link } from '@/i18n/navigation';
import { NotesListInput } from '../../nutrition/page';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ActionButtons from '@/components/atoms/Actions';
import DataTable from '@/components/atoms/Datatable';

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

const toSecondsFromValueAndUnit = (value, unit) => {
	const s = String(value ?? '').trim();
	if (!s) return null;
	const n = Number(s);
	if (!Number.isFinite(n) || n <= 0) return null;
	return unit === 'sec' ? Math.trunc(n) : Math.trunc(n) * 60;
};

const fromDurationSeconds = (secs, unit) => {
	const n = Number(secs);
	if (!Number.isFinite(n) || n <= 0) return '';
	return unit === 'sec' ? String(Math.trunc(n)) : String(Math.round(n / 60));
};

function buildPayloadFromPlan(sourcePlan, { userId, nameSuffix = ' (copy)', isActive = true } = {}) {
	const srcDays = sourcePlan?.program?.days || sourcePlan?.days || [];
	const safeName = (sourcePlan?.name || 'Plan') + nameSuffix;
	const days = srcDays.map((d, i) => ({
		dayOfWeek: String(d.dayOfWeek || d.day || 'saturday').toLowerCase(),
		nameOfWeek: d.nameOfWeek || d.name || `Day #${i + 1}`,
		warmupExercises: (d.warmupExercises || []).map((ex, idx) => ({
			order: ex.order || ex.orderIndex || idx + 1,
			exerciseId: ex.exerciseId || ex?.exercise?.id || ex?.id,
			targetSets: ex.targetSets ?? 3,
			targetReps: ex.targetReps ?? 12,
			tempo: ex.tempo ?? '1/1/1',
			restSeconds: ex.restSeconds ?? null,
			note: ex.note ?? null,
		})),
		exercises: (d.exercises || []).map((ex, idx) => ({
			order: ex.order || ex.orderIndex || idx + 1,
			exerciseId: ex.exerciseId || ex?.exercise?.id || ex?.id,
			targetSets: ex.targetSets ?? 3,
			targetReps: ex.targetReps ?? 12,
			tempo: ex.tempo ?? '1/1/1',
			restSeconds: ex.restSeconds ?? null,
			note: ex.note ?? null,
		})),
		cardioExercises: (d.cardioExercises || []).map((ex, idx) => ({
			order: ex.order || ex.orderIndex || idx + 1,
			exerciseId: ex.exerciseId || ex?.exercise?.id || ex?.id,
			durationSeconds: ex.durationSeconds ?? null,
			note: ex.note ?? '',
		})),
	}));
	return {
		userId: userId ?? null,
		name: safeName.trim(),
		isActive,
		notes: sourcePlan?.notes ?? null,
		program: { days },
	};
}

/* --------------------------- Sortable Exercise Row -------------------------- */
const SortableExerciseRow = memo(function SortableExerciseRow({
	ex,
	t,
	isCardio,
	onPreviewImg,
	onRemove,
	onSetField,
	normalizeIntOrDefault,
	normalizeTempoOrDefault,
	normalizeMinutesOrEmpty,
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ex.exerciseId });
	const style = { transform: CSS.Transform.toString(transform), transition };

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={[
				'rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:border-slate-300 hover:shadow-xs transition-all cursor-default will-change-transform',
				isDragging ? 'shadow-md border-[color:var(--color-primary-200)] bg-white' : '',
			].join(' ')}
		>
			<div className="flex items-start gap-3">
				<div className="flex items-center gap-2 min-w-0 flex-1 mt-0.5">
					<button
						type="button"
						{...attributes}
						{...listeners}
						className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 active:scale-[.98] transition"
						style={{ touchAction: 'none' }}
						aria-label={t('actions.drag', { default: 'Drag' })}
					>
						<GripVertical className="w-3.5 h-3.5" />
					</button>
					<div className="relative w-11 h-11 group shrink-0">
						<Img src={ex?.img} showBlur={false} className="w-full h-full rounded-lg object-contain bg-slate-50 border border-slate-100" />
						<button
							type="button"
							onClick={() => onPreviewImg?.(ex.img)}
							className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-lg"
						>
							<Eye className="h-3.5 w-3.5 text-white" />
						</button>
					</div>
					<div className="flex items-center gap-2 flex-wrap min-w-0">
						<MultiLangText className="text-xs font-semibold text-slate-900 truncate">{ex.name}</MultiLangText>
						{ex.category && (
							<span className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--color-primary-200)] bg-[color:var(--color-primary-50)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--color-primary-700)]">
								<Tag size={9} />
								<MultiLangText>{ex.category}</MultiLangText>
							</span>
						)}
					</div>
				</div>

				<div className="shrink-0 w-[540px] max-w-full">
					{!isCardio && (
						<div className="flex items-center justify-end gap-2">
							<div className="w-[320px] grid grid-cols-4 gap-1.5">
								<MiniField inputMode="numeric" type="number" placeholder={t('preview.sets')} value={ex.targetSets ?? ''} onChange={e => onSetField(ex.exerciseId, { targetSets: e.target.value })} onBlur={() => { if (String(ex.targetSets ?? '').trim()) onSetField(ex.exerciseId, { targetSets: normalizeIntOrDefault(ex.targetSets, 3) }); }} />
								<MiniField inputMode="numeric" placeholder={t('preview.reps')} value={ex.targetReps ?? ''} onChange={e => onSetField(ex.exerciseId, { targetReps: e.target.value })} onBlur={() => { if (String(ex.targetReps ?? '').trim()) onSetField(ex.exerciseId, { targetReps: normalizeIntOrDefault(ex.targetReps, 12) }); }} />
								<MiniField placeholder={t('preview.tempo', { default: 'Tempo' })} value={ex.tempo ?? ''} onChange={e => onSetField(ex.exerciseId, { tempo: e.target.value })} onBlur={() => { if (String(ex.tempo ?? '').trim()) onSetField(ex.exerciseId, { tempo: normalizeTempoOrDefault(ex.tempo, '1/1/1') }); }} />
								<MiniField inputMode="numeric" type="number" placeholder={t('builder.restTime')} value={ex.restSeconds ?? ''} onChange={e => onSetField(ex.exerciseId, { restSeconds: e.target.value })} onBlur={() => { if (String(ex.restSeconds ?? '').trim()) onSetField(ex.exerciseId, { restSeconds: normalizeIntOrDefault(ex.restSeconds, 90) }); }} />
							</div>
							<MiniTextArea className="mb-[-6px] w-[190px]" placeholder={t('builder.exerciseNote', { default: 'Note for this exercise...' })} value={ex.note ?? ''} onChange={val => onSetField(ex.exerciseId, { note: val })} />
							<button
								type="button"
								onClick={() => onRemove(ex.exerciseId)}
								className=" mb-[2px] shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition"
								title={t('actions.delete')}
							>
								<Trash2 className="w-3.5 h-3.5" />
							</button>
						</div>
					)}

					{isCardio && (
						<div className="flex items-start justify-end gap-2">
							<div className="flex border border-slate-200 bg-white shrink-0 rounded-[10px] overflow-hidden">
								<div className="flex">
									{['min', 'sec'].map(unit => (
										<button
											key={unit}
											type="button"
											onClick={() => {
												const prevVal = ex.durationValue;
												const prevUnit = ex.durationUnit ?? 'min';
												const secs = toSecondsFromValueAndUnit(prevVal, prevUnit);
												const newVal = secs != null ? fromDurationSeconds(secs, unit) : '';
												onSetField(ex.exerciseId, { durationUnit: unit, durationValue: newVal });
											}}
											className={[
												'px-2.5 py-1.5 text-[11px] font-semibold transition border-r border-slate-200',
												(ex.durationUnit ?? 'min') === unit
													? 'bg-[color:var(--color-primary-500)] text-white'
													: 'bg-white text-slate-500 hover:bg-slate-50',
											].join(' ')}
										>
											{t(`builder.cardio.${unit}`, { default: unit })}
										</button>
									))}
								</div>
								<MiniField
									inputMode="numeric"
									type="number"
									placeholder={ex.durationUnit === 'sec' ? t('builder.cardio.seconds') : t('builder.cardio.minutes', { default: 'Min' })}
									value={ex.durationValue ?? ''}
									onChange={e => onSetField(ex.exerciseId, { durationValue: e.target.value })}
									onBlur={() => onSetField(ex.exerciseId, { durationValue: normalizeMinutesOrEmpty(ex.durationValue) })}
									iconLeft={<Clock className="w-3 h-3 text-slate-400" />}
									className="!max-w-[100px] !rounded-none !border-0 !h-[35px] w-28"
								/>
							</div>
							<MiniTextArea
								placeholder={t('builder.cardio.note')}
								value={ex.note ?? ''}
								onChange={val => onSetField(ex.exerciseId, { note: val })}
								className="w-[280px]"
								cnInput="!h-[38px]"
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
});

export default function PlansPage() {
	const t = useTranslations('workoutPlans');
	const user = useUser();
	const scrollRef = useRef(null);

	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	const openedFromUrlRef = useRef(null);
	const skipNextUrlOpenRef = useRef(false);

	const [items, setItems] = useState([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [err, setErr] = useState(null);
	const [changePlans, setChangePlans] = useState(null);

	const [page, setPage] = useState(1);
	const [perPage, setPerPage] = useState(6);
	const [sortBy, setSortBy] = useState('created_at');
	const [sortOrder, setSortOrder] = useState('DESC');
	const [searchText, setSearchText] = useState('');
	const debounced = useDebounced(searchText, 350);

	const [preview, setPreview] = useState(null);
	const [addOpen, setAddOpen] = useState(false);
	const [editRow, setEditRow] = useState(null);
	const [assignOpen, setAssignOpen] = useState(null);
	const [usersOpen, setUsersOpen] = useState(null); // plan
	const [usersLoading, setUsersLoading] = useState(false);
	const [usersErr, setUsersErr] = useState(null);
	const [usersList, setUsersList] = useState([]);

	const [stats, setStats] = useState(null);
	const [loadingStats, setLoadingStats] = useState(true);
	const [clientsCoach, setClientsCoach] = useState();

	const clients = useAdminClients(user?.id, { page: 1, limit: 100, search: '' });

	useEffect(() => {
		if (user?.role == 'coach') api.get(`auth/coaches/${user?.id}/clients?limit=1000`).then(res => setClientsCoach(res.data));
	}, []);

	const optionsClient = useMemo(() => {
		const list = [];
		if (user?.role == 'admin') {
			if (clients?.items?.length) {
				for (const coach of clients.items) list.push({ id: coach.id, label: coach.name });
			}
		} else {
			if (clientsCoach?.users?.length) {
				for (const coach of clientsCoach.users) list.push({ id: coach.id, label: coach.name });
			}
		}
		return list;
	}, [user, clients?.items, clientsCoach?.users]);

	const reqId = useRef(0);
	const abortControllerRef = useRef(null);

	const fetchList = useCallback(async () => {
		if (abortControllerRef.current) abortControllerRef.current.abort();
		abortControllerRef.current = new AbortController();
		setErr(null);
		setLoading(true);
		const myId = ++reqId.current;
		try {
			const params = { page, limit: perPage, sortBy, sortOrder };
			if (debounced) params.search = debounced;
			const res = await api.get(user?.role == 'admin' ? '/plans' : `/plans?user_id=${user?.adminId}`, {
				params,
				signal: abortControllerRef.current.signal,
			});
			const data = res.data || {};
			let records = [], totalRecords = 0, serverPerPage = perPage;
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
			if (e?.name === 'CanceledError') return;
			if (myId !== reqId.current) return;
			setErr(e?.response?.data?.message || t('errors.loadPlans', 'Failed to load plans'));
		} finally {
			if (myId === reqId.current) setLoading(false);
		}
	}, [page, debounced, sortBy, sortOrder, perPage, t, user?.role, user?.adminId]);

	const fetchStats = useCallback(async () => {
		setLoadingStats(true);
		try {
			const params = {};
			if (debounced) params.search = debounced;
			const res = await api.get('/plans/overview', { params });
			setStats(res.data);
		} catch { } finally {
			setLoadingStats(false);
		}
	}, [debounced]);

	useEffect(() => setPage(1), [debounced, sortBy, sortOrder, perPage]);
	useEffect(() => void fetchList(), [changePlans, fetchList]);
	useEffect(() => void fetchStats(), [fetchStats]);
	useEffect(() => {
		return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
	}, []);

	const toggleSort = useCallback(field => {
		if (sortBy === field) setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
		else { setSortBy(field); setSortOrder('ASC'); }
	}, [sortBy]);

	const getOne = async id => (await api.get(`/plans/${id}`)).data;

	const [deleteId, setDeleteId] = useState(null);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);

	const askDelete = useCallback(id => { setDeleteId(id); setDeleteOpen(true); }, []);

	const handleDelete = useCallback(async () => {
		if (!deleteId) return;
		setDeleteLoading(true);
		try {
			await api.delete(`/plans/${deleteId}`);
			setItems(arr => arr.filter(x => x.id !== deleteId));
			setTotal(tot => Math.max(0, tot - 1));
			Notification(t('notifications.planDeleted'), 'success');
		} catch (e) {
			if (e?.response?.data?.message == 'You can only take actions on plans you created.') return Notification(t('planActionNotAllowed'), 'error');
			Notification(e?.response?.data?.message || t('notifications.planDeleteFailed'), 'error');
		} finally {
			setDeleteId(null);
			setDeleteLoading(false);
			setDeleteOpen(false);
		}
	}, [deleteId, t]);

	const createPlan = async payload => (await api.post('/plans', payload, { headers: { 'Content-Type': 'application/json' } })).data;
	const updatePlan = async (id, payload) => (await api.put(`/plans/${id}`, payload, { headers: { 'Content-Type': 'application/json' } })).data;

	const openPreview = async plan => {
		try { setPreview(await getOne(plan.id)); } catch { setPreview(plan); }
	};
	const openEdit = async plan => {
		try { setEditRow(await getOne(plan.id)); } catch { setEditRow(plan); }
	};
	const openAssign = plan => setAssignOpen(plan);
	const openUsers = async plan => {
		if (!plan?.id) return;
		setUsersOpen(plan);
		setUsersErr(null);
		setUsersLoading(true);
		try {
			const res = await api.get(`/plans/${plan.id}/assignees`);
			setUsersList(Array.isArray(res.data) ? res.data : []);
		} catch (e) {
			setUsersErr(e?.response?.data?.message || t('plans.usersModal.loadFailed', { default: 'Failed to load users' }));
			setUsersList([]);
		} finally {
			setUsersLoading(false);
		}
	};

	const sortLabel = sortBy === 'created_at'
		? sortOrder === 'ASC' ? t('plans.filters.oldestFirst') : t('plans.filters.newestFirst')
		: t('plans.filters.sortByDate');

	const [duplicatingIds, setDuplicatingIds] = useState(() => new Set());
	const markDuplicating = useCallback((id, on) => {
		setDuplicatingIds(prev => { const next = new Set(prev); on ? next.add(id) : next.delete(id); return next; });
	}, []);

	const handleDuplicate = useCallback(async plan => {
		if (!plan?.id) return;
		markDuplicating(plan.id, true);
		try {
			const full = await getOne(plan.id).catch(() => plan);
			const payload = buildPayloadFromPlan(full, {
				userId: user?.role == 'admin' ? user?.id : user?.adminId,
				nameSuffix: ` ${t('copySuffix', '(copy)')}`,
				isActive: full?.isActive ?? true,
			});
			const created = await createPlan(payload);
			setItems(arr => [created, ...arr]);
			setTotal(tot => tot + 1);
			Notification(t('notifications.planDuplicated', 'Plan duplicated. You can edit it now.'), 'success');
			setEditRow(created);
		} catch (e) {
			Notification(e?.response?.data?.message || t('notifications.duplicateFailed', 'Could not duplicate plan'), 'error');
		} finally {
			markDuplicating(plan.id, false);
		}
	}, [user?.id, user?.adminId, user?.role, t, markDuplicating]);

	useEffect(() => {
		const planId = searchParams.get('planId');
		if (!planId) return;
		if (skipNextUrlOpenRef.current) { skipNextUrlOpenRef.current = false; return; }
		if (openedFromUrlRef.current === planId) return;
		openedFromUrlRef.current = planId;
		(async () => {
			try {
				const full = await getOne(planId);
				setEditRow(full);
			} catch {
				const local = items.find(p => p.id === planId);
				if (local) setEditRow(local);
			}
		})();
	}, [searchParams, items]);

	const clearPlanIdFromUrl = useCallback(() => {
		skipNextUrlOpenRef.current = true;
		const sp = new URLSearchParams(searchParams.toString());
		sp.delete('planId');
		const qs = sp.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		openedFromUrlRef.current = null;
	}, [router, pathname, searchParams]);


	const onPreview = openPreview;
	const onEdit = openEdit;
	const onDelete = askDelete;
	const onAssign = openAssign;
	const onUsers = openUsers;
	const onDuplicate = handleDuplicate;

	const planColumns = [
		{
			key: 'name',
			header: t('plans.table.name'),
			cell: (row) => (
				<button type="button" onClick={() => onUsers?.(row.raw)} className="flex items-center gap-3 min-w-0 text-left group">
					<div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg theme-gradient-bg text-white shadow-sm">
						<Dumbbell className="h-5 w-5" />
					</div>

					<div className="min-w-0">
						<MultiLangText className="truncate text-sm font-semibold text-slate-900">
							{row.name}
						</MultiLangText>
					</div>
				</button>
			),
		},
		{
			key: 'daysCount',
			header: t('plans.table.days'),
			cell: (row) => (
				<span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
					<Calendar className="w-3 h-3" />
					{row.daysCount}
				</span>
			),
		},
		{
			key: 'clientsUsingCount',
			header: t('plans.table.clientsUsing', { default: 'Clients' }),
			cell: (row) => (
				<button
					type="button"
					onClick={() => onUsers?.(row.raw)}
					className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-white hover:border-slate-300 transition"
				>
					<UsersIcon className="w-3 h-3" />
					{Number(row.clientsUsingCount ?? 0)}
				</button>
			),
		},
		{
			key: 'status',
			header: t('plans.table.status'),
			cell: (row) => (
				<span
					className={[
						'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold border',
						row.isActive
							? 'bg-emerald-50 text-emerald-700 border-emerald-100'
							: 'bg-slate-100 text-slate-500 border-slate-200',
					].join(' ')}
				>
					<Zap className="w-3 h-3" />
					{row.isActive ? t('plans.table.active') : t('plans.table.inactive')}
				</span>
			),
		},
		{
			key: 'createdAt',
			header: t('plans.table.createdAt'),
			cell: (row) => (
				<span className="text-sm text-slate-500 whitespace-nowrap">
					{row.createdAt}
				</span>
			),
		},
		{
			key: 'actions',
			header: t('plans.table.actions'),
			cell: (row) => (
				<ActionButtons
					row={row.raw}
					actions={[
						{
							icon: <UsersIcon />,
							tooltip: t('actions.viewUsers', { default: 'View users' }),
							variant: 'blue',
							onClick: r => onUsers?.(r),
						},
						{
							icon: <UserPlus />,
							tooltip: t('actions.assignUsers', { default: 'Assign' }),
							variant: 'slate',
							onClick: r => onAssign?.(r),
						},
						{
							icon: <Share2 />,
							tooltip: t('actions.share', { default: 'Share' }),
							variant: 'emerald',
							onClick: r => window.open(`/workouts/plans/${r.id}`, '_blank', 'noopener,noreferrer'),
						},
						{
							icon: duplicatingIds?.has(row.id) ? <Loader2 className="animate-spin" /> : <Layers />,
							tooltip: t('actions.duplicate', { default: 'Duplicate' }),
							variant: 'purple',
							disabled: duplicatingIds?.has(row.id),
							onClick: r => onDuplicate?.(r),
						},
						{
							icon: <Eye />,
							tooltip: t('actions.preview'),
							variant: 'slate',
							onClick: r => onPreview?.(r),
						},
						{
							icon: <PencilLine />,
							tooltip: t('actions.edit'),
							variant: 'amber',
							hidden: row.raw?.adminId == null,
							onClick: r => onEdit?.(r),
						},
						{
							icon: <Trash2 />,
							tooltip: t('actions.delete'),
							variant: 'red',
							hidden: row.raw?.adminId == null,
							onClick: r => onDelete?.(r.id),
						},
					]}
				/>
			),
		},
	];
	const tableRows = useMemo(() => {
		return (items || []).map((p) => ({
			id: p.id,
			name: p.name,
			daysCount: Array.isArray(p?.program?.days) ? p.program.days.length : 0,
			clientsUsingCount: p?.clientsUsingCount ?? 0,
			isActive: !!p?.isActive,
			createdAt: p?.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : '—',
			raw: p,
		}));
	}, [items]);

	const tableActions = [
		{
			key: 'sort-created-at',
			label: sortLabel,
			icon: sortOrder === 'ASC'
				? <ChevronUp size={15} className="text-slate-400" />
				: <ChevronDown size={15} className="text-slate-400" />,
			onClick: () => toggleSort('created_at'),
		},
	];


	return (
		<div className="space-y-6">
			<PageHeader
				title={t('plans.header.title')}
				desc={t('plans.header.desc')}
				icon={Layers}
				actions={
					<motion.button
						whileHover={{ scale: 1.04 }}
						whileTap={{ scale: 0.95 }}
						onClick={() => setAddOpen(true)}
						className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-black text-white"
						style={{
							background: 'rgba(255,255,255,0.22)',
							backdropFilter: 'blur(16px)',
							boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.3),0 4px 16px rgba(0,0,0,0.1)',
						}}
					>
						<Plus className="h-4 w-4" />
						{t('plans.header.newPlanButton')}
					</motion.button>
				}
			>
				{user?.role == 'admin' && (
					<>
						<StatCard icon={Layers} title={t('plans.stats.globalPlans')} value={stats?.plans?.total || 0} />
						<StatCard icon={Layers} title={t('plans.stats.personalPlans')} value={stats?.plans?.totalPlansPersonal || 0} />
					</>
				)}
			</PageHeader>
			{err && (
				<div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm">
					<span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-500 mt-px" />
					{err}
				</div>
			)}

			<DataTable
				columns={planColumns}
				data={tableRows}
				isLoading={loading}
				searchValue={searchText}
				onSearchChange={(value) => {
					setSearchText(value);
					setPage(1);
				}}
				onSearch={() => setPage(1)}
				actions={tableActions}
				labels={{
					searchPlaceholder: t('placeholders.searchPlan'),
					emptyTitle: t('plans.list.noPlansTitle'),
					emptySubtitle: t('plans.list.noPlansDesc'),
				}}
				pagination={{
					current_page: page,
					per_page: perPage,
					total_records: total,
				}}
				onPageChange={({ page: nextPage, per_page }) => {
					setPage(Number(nextPage ?? 1));
					setPerPage(Number(per_page ?? 6));
				}}
				perPageOptions={[6 ,12 , 24, 48]}
				rowKey={(row) => row.id}
				hoverable
			/>

			{/* Modals */}
			<Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || t('plans.modals.previewTitle')} maxW="max-w-4xl">
				{preview && <PlanPreview plan={preview} />}
			</Modal>

			<Modal scrollRef={scrollRef} open={addOpen} onClose={() => setAddOpen(false)} title={t('plans.modals.createTitle')} maxW="max-w-5xl">
				<NewPlanBuilder
					scrollRef={scrollRef}
					userId={user?.id}
					onCancel={() => setAddOpen(false)}
					onCreate={async payload => {
						try {
							const saved = await createPlan(payload);
							setItems(arr => [saved, ...arr]);
							setTotal(tot => tot + 1);
							setAddOpen(false);
							Notification(t('notifications.planCreated'), 'success');
						} catch (e) {
							if (e?.response?.data?.message == 'Duplicate day: saturday') return Notification(t('notifications.duplicateDay'), 'error');
							Notification(e?.response?.data?.message || t('notifications.createFailed'), 'error');
						}
					}}
				/>
			</Modal>

			<Modal
				scrollRef={scrollRef}
				open={!!editRow}
				onClose={() => { clearPlanIdFromUrl(); setEditRow(null); }}
				title={`${t('plans.modals.editTitle')} ${editRow?.name || ''}`}
				maxW="max-w-5xl"
			>
				{editRow && (
					<NewPlanBuilder
						scrollRef={scrollRef}
						userId={user?.id}
						initial={editRow}
						onCancel={() => setEditRow(null)}
						onCreate={async payload => {
							try {
								const saved = await updatePlan(editRow.id, payload);
								setItems(arr => arr.map(p => (p.id === editRow.id ? saved : p)));
								clearPlanIdFromUrl();
								setEditRow(null);
								Notification(t('notifications.planUpdated'), 'success');
							} catch (e) {
								if (e?.response?.data?.message == 'You can only take actions on plans you created.') return Notification(t('planActionNotAllowed'), 'error');
								Notification(e?.response?.data?.message || t('notifications.createFailed'), 'error');
							}
						}}
					/>
				)}
			</Modal>

			<Modal open={!!assignOpen} onClose={() => setAssignOpen(null)} title={t('plans.modals.assignTitle', { name: assignOpen?.name || '' })} maxW="max-w-md">
				{assignOpen && (
					<AssignForm
						setChangePlans={setChangePlans}
						setPlans={setItems}
						plans={items}
						planId={assignOpen.id}
						optionsClient={optionsClient}
						onClose={() => setAssignOpen(null)}
						onAssigned={() => setAssignOpen(null)}
					/>
				)}
			</Modal>

			<Modal
				open={!!usersOpen}
				onClose={() => { setUsersOpen(null); setUsersList([]); setUsersErr(null); }}
				title={t('plans.usersModal.title', { default: 'Plan users' })}
				maxW="max-w-xl"
			>
				<div className="space-y-4">
					<div className="flex items-center justify-between gap-3">
						<div className="min-w-0">
							<p className="text-sm font-semibold text-slate-900 truncate">{usersOpen?.name}</p>
							<p className="text-xs text-slate-400">{t('plans.usersModal.count', { default: '{count} users', count: usersList?.length || 0 })}</p>
						</div>
						<button
							type="button"
							onClick={() => { setAssignOpen(usersOpen); }}
							className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
						>
							<UserPlus className="w-4 h-4 text-slate-500" />
							{t('actions.assignUsers', { default: 'Assign' })}
						</button>
					</div>

					{usersLoading && (
						<div className="flex items-center gap-2 text-sm text-slate-500">
							<Loader2 className="w-4 h-4 animate-spin" />
							{t('plans.usersModal.loading', { default: 'Loading…' })}
						</div>
					)}

					{usersErr && (
						<div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
							{usersErr}
						</div>
					)}

					{!usersLoading && !usersErr && (usersList?.length ? (
						<ul className="space-y-2">
							{usersList.map(u => (
								<li key={u.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
									<div className="min-w-0">
										<p className="text-sm font-semibold text-slate-900 truncate">{u.name}</p>
										<p className="text-xs text-slate-400 truncate">{u.email}</p>
									</div>
									<span className={[
										'inline-flex items-center rounded-lg border px-2 py-1 text-[11px] font-bold',
										u.subscriptionActive
											? 'bg-emerald-50 text-emerald-700 border-emerald-100'
											: 'bg-rose-50 text-rose-700 border-rose-100',
									].join(' ')}>
										{u.subscriptionActive ? t('plans.usersModal.subscriptionActive', { default: 'Active' }) : t('plans.usersModal.subscriptionInactive', { default: 'Inactive' })}
									</span>
								</li>
							))}
						</ul>
					) : (
						<div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
							<p className="text-sm font-semibold text-slate-700">{t('plans.usersModal.emptyTitle', { default: 'No users' })}</p>
							<p className="text-xs text-slate-400 mt-1">{t('plans.usersModal.emptyDesc', { default: 'No clients are using this plan yet.' })}</p>
						</div>
					))}
				</div>
			</Modal>

			<ConfirmDialog
				loading={deleteLoading}
				open={deleteOpen}
				onClose={() => { setDeleteOpen(false); setDeleteId(null); }}
				title={t('confirm.deletePlanTitle')}
				message={t('confirm.deletePlanMsg')}
				confirmText={t('confirm.confirmBtn')}
				onConfirm={handleDelete}
			/>
		</div>
	);
}

/* ─────────────────── ConfirmDialog ─────────────────── */
const ConfirmDialog = memo(function ConfirmDialog({ open, onClose, loading, title, message, onConfirm, confirmText }) {
	const t = useTranslations('workoutPlans');
	return (
		<Modal open={open} onClose={onClose} title={title || t('confirm.titleDefault')} maxW="max-w-md">
			<div className="space-y-5">
				{message && <p className="text-sm text-slate-600 md: leading-relaxed">{message}</p>}
				<div className="flex items-center justify-end gap-2">
					<button
						type="button"
						onClick={onClose}
						className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
					>
						{t('actions.cancel')}
					</button>
					<Button name={confirmText || t('confirm.confirmBtn')} loading={loading} color="danger" className="!w-fit !h-9" onClick={onConfirm} />
				</div>
			</div>
		</Modal>
	);
});


/* ─────────────────── PlanPreview ─────────────────── */
const PlanPreview = memo(function PlanPreview({ plan }) {
	const t = useTranslations('workoutPlans');
	const days = plan?.program?.days || [];
	const formatDateTime = value => (value ? new Date(value).toLocaleString() : '—');

	return (
		<div className="space-y-5">
			<div className="space-y-3">
				{days.map((d, idx) => {
					const warmup = d.warmupExercises || [];
					const main = d.exercises || [];
					const cardio = d.cardioExercises || [];
					const exercises = [...warmup, ...main, ...cardio];
					const hasExercises = exercises.length > 0;

					return (
						<section key={d.id || idx} className="rounded-lg border border-slate-100 bg-white overflow-hidden shadow-xs">
							{/* Day header */}
							<header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
								<div className="flex items-center gap-3">
									<span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[color:var(--color-primary-100)] text-[11px] font-bold text-[color:var(--color-primary-700)]">
										{idx + 1}
									</span>
									<MultiLangText className="text-sm font-semibold text-slate-800">{d.name}</MultiLangText>
								</div>
								<div className="flex items-center gap-2">
									<span className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600">
										{t(`days.${d.dayOfWeek}`)}
									</span>
									<span className="rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
										{exercises.length} {exercises.length === 1 ? t('preview.exercise') : t('preview.exercises')}
									</span>
								</div>
							</header>

							<div className="p-4">
								{hasExercises ? (
									<ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
										{exercises.map((ex, i) => {
											const isCardio = ex?.durationSeconds != null || (ex?.note != null && ex?.targetSets == null);
											return (
												<li key={ex.id || ex.exerciseId || i} className="relative flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5 hover:border-[color:var(--color-primary-200)] hover:bg-white transition-all duration-150">
													<span className="absolute -top-0 -left-0 z-10 inline-flex h-5 w-5 items-center justify-center rounded-br-lg rounded-tl-xl bg-[color:var(--color-primary-500)] text-[10px] font-bold text-white">
														{i + 1}
													</span>
													<div className="shrink-0 mt-0.5">
														<Img showBlur={false} src={ex.img} alt={ex.name} className="h-14 w-14 rounded-lg bg-white object-contain border border-slate-100" />
													</div>
													<div className="flex min-w-0 flex-1 flex-col gap-1">
														<MultiLangText className="text-xs font-semibold text-slate-900 truncate md: leading-snug">{ex.name}</MultiLangText>
														{!isCardio && (ex.targetSets || ex.targetReps) && (
															<div className="flex flex-wrap gap-1">
																{ex.targetSets && (
																	<span className="rounded-lg bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
																		{ex.targetSets} {t('preview.sets')}
																	</span>
																)}
																{ex.targetReps && (
																	<span className="rounded-lg bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
																		{ex.targetReps} {t('preview.reps')}
																	</span>
																)}
																{(ex.restSeconds ?? ex.rest) ? (
																	<span className="rounded-lg bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
																		{t('builder.restTime')} {ex.restSeconds ?? ex.rest}s
																	</span>
																) : null}
															</div>
														)}
														{isCardio && ex.durationSeconds && (
															<div className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 w-fit">
																<Clock className="w-3 h-3" />
																{Number(ex.durationSeconds) >= 60
																	? `${Math.round(Number(ex.durationSeconds) / 60)} min`
																	: `${Math.round(Number(ex.durationSeconds))} sec`}
															</div>
														)}
														{ex.note && <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{ex.note}</p>}
													</div>
												</li>
											);
										})}
									</ol>
								) : (
									<div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
										<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-base">💡</span>
										<div>
											<p className="font-medium text-slate-700 text-xs">{t('preview.noExercisesYetTitle')}</p>
											<p className="text-[11px] text-slate-400">{t('preview.noExercisesYetHelper')}</p>
										</div>
									</div>
								)}
							</div>
						</section>
					);
				})}

				{!days.length && (
					<div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
						{t('preview.noDaysYet')}
					</div>
				)}
			</div>

			<footer className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5">
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
					<span>{t('preview.createdAt')} <span className="font-medium text-slate-600">{formatDateTime(plan.created_at)}</span></span>
					<span className="hidden sm:inline text-slate-200">•</span>
					<span>{t('preview.updatedAt')} <span className="font-medium text-slate-600">{formatDateTime(plan.updated_at)}</span></span>
				</div>
			</footer>
		</div>
	);
});

/* ─────────────────── ASSIGN ─────────────────── */
const AssignForm = memo(function AssignForm({ planId, onClose, onAssigned, optionsClient, setChangePlans }) {
	const t = useTranslations('workoutPlans');
	const [selectedUsers, setSelectedUsers] = useState([]);
	const [submitting, setSubmitting] = useState(false);

	const addUser = userId => {
		if (!userId) return;
		if (selectedUsers.some(u => u.id === userId)) return;
		const user = optionsClient.find(u => u.id === userId);
		if (!user) return;
		setSelectedUsers(prev => [...prev, user]);
	};
	const removeUser = userId => setSelectedUsers(prev => prev.filter(u => u.id !== userId));

	const submit = async e => {
		e.preventDefault();
		if (!selectedUsers.length) return;
		setSubmitting(true);
		try {
			const athleteIds = selectedUsers.map(u => u.id);
			await api.post(`/plans/${planId}/assign`, { athleteIds, isActive: true, confirm: 'yes' });
			setChangePlans(JSON.stringify(athleteIds + planId));
			Notification(t('notifications.assignedSuccess'), 'success');
			onAssigned?.();
		} catch (err) {
			Notification(err?.response?.data?.message || t('notifications.assignFailed'), 'error');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<form onSubmit={submit} className="space-y-5">
			<div>
				<label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">{t('assign.selectUsersLabel')}</label>
				<Select
					placeholder={t('assign.selectUsersPlaceholder')}
					options={optionsClient.filter(o => !selectedUsers.some(u => u.id === o.id))}
					value={null}
					onChange={addUser}
					searchable
				/>
			</div>

			{selectedUsers.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{selectedUsers.map(user => (
						<span
							key={user.id}
							className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--color-primary-200)] bg-[color:var(--color-primary-50)] text-[color:var(--color-primary-700)] text-xs px-3 py-1.5 font-medium"
						>
							{user.label}
							<button type="button" onClick={() => removeUser(user.id)} className="hover:text-[color:var(--color-primary-900)] transition" aria-label={t('assign.removeUser')}>
								<X className="w-3 h-3" />
							</button>
						</span>
					))}
				</div>
			)}

			<div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
				<button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
					{t('actions.cancel')}
				</button>
				<Button
					disabled={submitting || selectedUsers.length === 0}
					type="submit"
					color="primary"
					name={submitting ? t('assign.assigning') : t('actions.assign')}
					loading={submitting}
					className="!h-9 !w-fit"
				/>
			</div>
		</form>
	);
});

/* ─────────────────── NewPlanBuilder ─────────────────── */
const NewPlanBuilder = memo(function NewPlanBuilder({ scrollRef, initial, onCancel, onCreate }) {
	const t = useTranslations('workoutPlans');
	const [name, setName] = useState(initial?.name || '');
	const [notes, setNotes] = useState(() => {
		const v = initial?.notes;
		return Array.isArray(v) && v.length ? v : [''];
	});
	const [pickerBlock, setPickerBlock] = useState('main');

	const makeNewDay = idx => ({
		id: `day_${Date.now()}_${idx}`,
		dayOfWeek: 'saturday',
		nameOfWeek: t('builder.dayNumber', { num: idx }),
		warmupExercises: [],
		exercises: [],
		cardioExercises: [],
	});

	const [days, setDays] = useState(() => {
		const d = initial?.days || initial?.program?.days || [];
		const mapped = d.map((x, i) => ({
			id: x.id,
			dayOfWeek: (x.day || x.dayOfWeek || '').toLowerCase() || 'saturday',
			nameOfWeek: x.nameOfWeek || x.name || t('builder.dayNumber', { num: i + 1 }),
			warmupExercises: (x.warmupExercises || []).map((e, j) => ({
				exerciseId: e.exerciseId || e.exercise?.id || e.id,
				name: e.name || e.exercise?.name,
				img: e.img,
				category: e.exercise?.category || e.category || null,
				order: e.order || e.orderIndex || j + 1,
				targetSets: e.targetSets ?? 3,
				targetReps: e.targetReps ?? 12,
				tempo: e.tempo ?? '1/1/1',
				restSeconds: e.restSeconds ?? e.rest ?? null,
				note: e.note ?? '',
			})),
			exercises: (x.exercises || []).map((e, j) => ({
				exerciseId: e.exerciseId || e.exercise?.id || e.id,
				name: e.name || e.exercise?.name,
				img: e.img,
				category: e.exercise?.category || e.category || null,
				order: e.order || e.orderIndex || j + 1,
				targetSets: e.targetSets ?? 3,
				targetReps: e.targetReps ?? 12,
				tempo: e.tempo ?? '1/1/1',
				restSeconds: e.restSeconds ?? e.rest ?? null,
				note: e.note ?? '',
			})),
			cardioExercises: (x.cardioExercises || []).map((e, j) => ({
				exerciseId: e.exerciseId || e.exercise?.id || e.id,
				name: e.name || e.exercise?.name,
				img: e.img,
				category: e.exercise?.category || e.category || null,
				order: e.order || e.orderIndex || j + 1,
				durationValue: fromDurationSeconds(e.durationSeconds, 'min'),
				durationUnit: 'min',
				note: e.note ?? '',
			})),
		}));
		if (mapped.length > 0) return mapped;
		return [makeNewDay(1)];
	});

	const addDay = () => {
		setDays(arr => [...arr, makeNewDay(arr.length + 1)]);
		setTimeout(() => {
			if (scrollRef?.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
		}, 0);
	};

	const duplicateDay = id => {
		setDays(arr => {
			const index = arr.findIndex(d => d.id === id);
			if (index === -1) return arr;
			const source = arr[index];
			const newId = `day_${Date.now()}_${index + 1}`;
			const copyList = list => (list || []).map((ex, idx) => ({ ...ex, order: idx + 1 }));
			const duplicated = {
				...source, id: newId,
				nameOfWeek: `${source.nameOfWeek} ${t('copySuffix', '(copy)')}`,
				warmupExercises: copyList(source.warmupExercises),
				exercises: copyList(source.exercises),
				cardioExercises: copyList(source.cardioExercises),
			};
			const next = [...arr];
			next.splice(index + 1, 0, duplicated);
			return next;
		});
		setTimeout(() => {
			if (scrollRef?.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
		}, 0);
	};

	const removeDay = id => setDays(arr => arr.filter(d => d.id !== id));

	const [pickerOpen, setPickerOpen] = useState(false);
	const [pickerDayId, setPickerDayId] = useState(null);

	const pickerInitialSelected = useMemo(() => {
		const day = days.find(d => d.id === pickerDayId);
		if (!day) return [];
		const key = pickerBlock === 'warmup' ? 'warmupExercises' : pickerBlock === 'cardio' ? 'cardioExercises' : 'exercises';
		return (day[key] || []).map(ex => ({ id: ex.exerciseId, name: ex.name, category: ex.category || null, img: ex.img }));
	}, [pickerDayId, pickerBlock, days]);

	const openPicker = (dayId, block = 'main') => {
		setPickerDayId(dayId);
		setPickerBlock(block);
		setPickerOpen(true);
	};

	const onPickerDone = pickedArray => {
		const key = pickerBlock === 'warmup' ? 'warmupExercises' : pickerBlock === 'cardio' ? 'cardioExercises' : 'exercises';
		setDays(arr => arr.map(day => {
			if (day.id !== pickerDayId) return day;
			const current = day[key] || [];
			const pickedIds = pickedArray.map(x => x.id);
			const keptExisting = current.filter(ex => pickedIds.includes(ex.exerciseId));
			const existingIdsSet = new Set(current.map(ex => ex.exerciseId));
			const newOnes = pickedArray.filter(x => !existingIdsSet.has(x.id)).map(x => {
				if (pickerBlock === 'cardio') return { exerciseId: x.id, name: x.name, category: x.category || null, img: x.img, durationValue: '', durationUnit: 'min', note: '' };
				return { exerciseId: x.id, name: x.name, category: x.category || null, img: x.img, targetSets: 3, targetReps: 12, tempo: '1/1/1', restSeconds: null, note: '' };
			});
			const merged = [...keptExisting, ...newOnes].map((ex, idx) => ({ ...ex, order: idx + 1 }));
			return { ...day, [key]: merged };
		}));
		setPickerOpen(false);
		setPickerDayId(null);
	};

	const onReorderExercises = (dayId, block, newOrder) => {
		const key = block === 'warmup' ? 'warmupExercises' : block === 'cardio' ? 'cardioExercises' : 'exercises';
		setDays(arr => arr.map(d => {
			if (d.id !== dayId) return d;
			return { ...d, [key]: newOrder.map((ex, idx) => ({ ...ex, order: idx + 1 })) };
		}));
	};

	const [loading, setLoading] = useState(false);
	const user = useUser();

	const submit = async () => {
		if (!name.trim()) return Notification(t('builder.validation.nameRequired'), 'error');
		if (!days.length) return Notification(t('builder.validation.needDay'), 'error');
		if (days.some(d => !(d.exercises?.length || d.warmupExercises?.length || d.cardioExercises?.length))) {
			return Notification(t('builder.validation.needExercisePerDay'), 'error');
		}
		const payload = {
			userId: user?.role == 'admin' ? user?.id : user?.adminId,
			name: name.trim(),
			isActive: true,
			notes: notes || null,
			program: {
				days: days.map(d => ({
					dayOfWeek: d.dayOfWeek,
					nameOfWeek: d.nameOfWeek,
					warmupExercises: (d.warmupExercises || []).map(ex => ({
						order: ex.order, exerciseId: ex.exerciseId,
						targetSets: ex.targetSets === '' || ex.targetSets == null ? null : Number(ex.targetSets),
						targetReps: ex.targetReps === '' || ex.targetReps == null ? null : Number(ex.targetReps),
						tempo: ex.tempo === '' || ex.tempo == null ? null : String(ex.tempo).trim(),
						restSeconds: ex.restSeconds === '' || ex.restSeconds == null ? null : Number(ex.restSeconds),
						note: String(ex.note ?? '').trim() || null,
					})),
					exercises: (d.exercises || []).map(ex => ({
						order: ex.order, exerciseId: ex.exerciseId,
						targetSets: ex.targetSets === '' || ex.targetSets == null ? null : Number(ex.targetSets),
						targetReps: ex.targetReps === '' || ex.targetReps == null ? null : Number(ex.targetReps),
						tempo: ex.tempo === '' || ex.tempo == null ? null : String(ex.tempo).trim(),
						restSeconds: ex.restSeconds === '' || ex.restSeconds == null ? null : Number(ex.restSeconds),
						note: String(ex.note ?? '').trim() || null,
					})),
					cardioExercises: (d.cardioExercises || []).map(ex => ({
						order: ex.order, exerciseId: ex.exerciseId,
						durationSeconds: toSecondsFromValueAndUnit(ex.durationValue, ex.durationUnit ?? 'min'),
						note: String(ex.note ?? '').trim() || null,
					})),
				})),
			},
		};
		setLoading(true);
		await onCreate?.(payload);
		setLoading(false);
	};

	const DAY_OPTIONS = [
		{ id: 'saturday', label: t('days.saturday') },
		{ id: 'sunday', label: t('days.sunday') },
		{ id: 'monday', label: t('days.monday') },
		{ id: 'tuesday', label: t('days.tuesday') },
		{ id: 'wednesday', label: t('days.wednesday') },
		{ id: 'thursday', label: t('days.thursday') },
		{ id: 'friday', label: t('days.friday') },
	];

	return (
		<div className="flex flex-col gap-5 py-1">
			<div className="space-y-5 pb-24">
				{/* Top bar */}
				<div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
					<Input className="max-w-[380px] w-full" placeholder={t('builder.namePlaceholder')} value={name} onChange={e => setName(e)} />
					<button
						type="button"
						onClick={addDay}
						className="inline-flex items-center gap-2 h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 active:scale-[.97] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-300)]"
					>
						<Plus className="w-4 h-4 text-slate-500" />
						{t('actions.addDay')}
					</button>
				</div>

				<NotesListInput value={notes} onChange={setNotes} />

				<DaysListSection
					days={days}
					setDays={setDays}
					openPicker={openPicker}
					removeDay={removeDay}
					duplicateDay={duplicateDay}
					onReorderExercises={onReorderExercises}
					DAY_OPTIONS={DAY_OPTIONS}
					spring={spring}
				/>
			</div>

			{/* Sticky footer actions */}
			<div className="sticky bottom-0 z-10 -mx-1 px-1">
				<div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-white/95 backdrop-blur px-0 pt-4 pb-3 shadow-[0_-10px_30px_-20px_rgba(15,23,42,0.35)]">
					<button
						type="button"
						onClick={onCancel}
						className="inline-flex items-center justify-center h-10 px-5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 active:scale-[.97] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
					>
						{t('actions.cancel')}
					</button>
					<Button name={t('builder.savePlanBtn')} loading={loading} type="button" onClick={submit} className="!w-fit !h-10 text-sm" />
				</div>
			</div>

			<ExercisePicker
				open={pickerOpen}
				dayId={pickerDayId}
				initialSelected={pickerInitialSelected}
				onClose={() => { setPickerOpen(false); setPickerDayId(null); }}
				onDone={onPickerDone}
			/>
		</div>
	);
});

/* ─────────────────── DaysListSection ─────────────────── */
export function DaysListSection({ duplicateDay, days, setDays, openPicker, removeDay, onReorderExercises, DAY_OPTIONS, spring }) {
	const t = useTranslations('workoutPlans');
	const [previewImg, setPreviewImg] = useState(null);
	const [activeDrag, setActiveDrag] = useState(null);

	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	// Sortable row is defined inside `renderBlock` to reuse closures.

	const normalizeIntOrDefault = (v, def) => {
		const s = String(v ?? '').trim();
		if (!s) return def;
		const n = Number(s);
		if (!Number.isFinite(n) || n <= 0) return def;
		return Math.trunc(n);
	};

	const normalizeTempoOrDefault = (v, def) => {
		const s = String(v ?? '').trim();
		if (!s) return def;
		if (/^\d+\/\d+\/\d+$/.test(s)) return s;
		return def;
	};

	const normalizeMinutesOrEmpty = v => {
		const s = String(v ?? '').trim();
		if (!s) return '';
		const n = Number(s);
		if (!Number.isFinite(n) || n <= 0) return '';
		return String(Math.trunc(n));
	};

	/* Block labels */
	const blockMeta = {
		warmup: { color: 'amber', icon: <Zap className="w-3 h-3" /> },
		main: { color: 'primary', icon: <Dumbbell className="w-3 h-3" /> },
		cardio: { color: 'blue', icon: <Clock className="w-3 h-3" /> },
	};

	const blockColorMap = {
		warmup: 'bg-amber-50 text-amber-700 border-amber-200',
		main: 'bg-[color:var(--color-primary-50)] text-[color:var(--color-primary-700)] border-[color:var(--color-primary-200)]',
		blue: 'bg-blue-50 text-blue-700 border-blue-200',
	};

	const renderBlock = (day, block, list) => {
		if (!list?.length) return null;
		const key = block === 'warmup' ? 'warmupExercises' : block === 'cardio' ? 'cardioExercises' : 'exercises';
		const title = block === 'warmup'
			? t('builder.blocks.warmup', { default: 'Warmup' })
			: block === 'cardio'
				? t('builder.blocks.cardio', { default: 'Cardio' })
				: t('builder.blocks.workout', { default: 'Workout' });

		const setExerciseField = (exerciseId, patch) => {
			setDays(arr => arr.map(d0 => d0.id !== day.id ? d0 : {
				...d0,
				[key]: (d0[key] || []).map(e => e.exerciseId !== exerciseId ? e : { ...e, ...patch }),
			}));
		};

		const removeExercise = exerciseId => {
			setDays(arr => arr.map(d0 => d0.id !== day.id ? d0 : { ...d0, [key]: (d0[key] || []).filter(e => e.exerciseId !== exerciseId) }));
		};

		const isCardio = block === 'cardio';
		const blockColor = block === 'cardio' ? 'blue' : block;

		return (
			<div className="mb-5 last:mb-0">
				<div className="flex items-center gap-2 mb-2.5">
					<span className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold ${blockColorMap[blockColor]}`}>
						{blockMeta[block]?.icon}
						{title}
					</span>
					{list?.length > 0 && (
						<span className="text-[11px] text-slate-400">{list.length} {list.length === 1 ? t('preview.exercise') : t('preview.exercises')}</span>
					)}
				</div>

				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragStart={(evt) => {
						const id = evt?.active?.id;
						if (!id) return;
						const found = list.find(x => x.exerciseId === id);
						setActiveDrag(found || null);
					}}
					onDragCancel={() => setActiveDrag(null)}
					onDragEnd={(evt) => {
						const { active, over } = evt;
						setActiveDrag(null);
						if (!active?.id || !over?.id) return;
						if (active.id === over.id) return;
						const oldIndex = list.findIndex(x => x.exerciseId === active.id);
						const newIndex = list.findIndex(x => x.exerciseId === over.id);
						if (oldIndex < 0 || newIndex < 0) return;
						const next = arrayMove(list, oldIndex, newIndex);
						onReorderExercises(day.id, block, next);
					}}
					measuring={{ droppable: { strategy: 'always' } }}
				>
					<SortableContext items={list.map(x => x.exerciseId)} strategy={verticalListSortingStrategy}>
						<div className="space-y-2">
							{list.map(ex => (
								<SortableExerciseRow
									key={ex.exerciseId}
									ex={ex}
									t={t}
									isCardio={isCardio}
									onPreviewImg={setPreviewImg}
									onRemove={removeExercise}
									onSetField={setExerciseField}
									normalizeIntOrDefault={normalizeIntOrDefault}
									normalizeTempoOrDefault={normalizeTempoOrDefault}
									normalizeMinutesOrEmpty={normalizeMinutesOrEmpty}
								/>
							))}
						</div>
					</SortableContext>
					<DragOverlay
						modifiers={[snapCenterToCursor]}
						dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}
					>
						{activeDrag ? (
							<div
								style={{ width: 'fit-content', maxWidth: 'min(720px, 92vw)', pointerEvents: 'none' }}
								className="rounded-lg border border-[color:var(--color-primary-200)] bg-white px-3 py-2.5 shadow-xl scale-[1.02] opacity-95"
							>
								<div className="flex items-center gap-2">
									<GripVertical className="w-3.5 h-3.5 text-slate-300" />
									<MultiLangText className="text-xs font-semibold text-slate-900 truncate max-w-[420px]">{activeDrag.name}</MultiLangText>
								</div>
							</div>
						) : null}
					</DragOverlay>
				</DndContext>

				{/* Add more under existing items */}
				{list?.length > 0 && (
					<div className="mt-2">
						<button
							type="button"
							onClick={() => openPicker(day.id, block)}
							className={[
								'inline-flex items-center gap-2 h-9 px-3 rounded-lg border bg-white text-xs font-semibold transition',
								block === 'warmup'
									? 'border-amber-200 text-amber-700 hover:bg-amber-50'
									: block === 'cardio'
										? 'border-blue-200 text-blue-700 hover:bg-blue-50'
										: 'border-[color:var(--color-primary-200)] text-[color:var(--color-primary-700)] hover:bg-[color:var(--color-primary-50)]',
							].join(' ')}
						>
							<Plus className="w-3.5 h-3.5" />
							{t('builder.addMore', { default: 'Add more' })}
						</button>
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="space-y-3">
			{days.map(d => (
				<motion.div
					key={d.id}
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={spring}
					className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs"
				>
					{/* Day header */}
					<div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
						<Select
							clearable={false}
							searchable={false}
							className="!w-[150px]"
							placeholder={t('builder.selectDayPlaceholder')}
							options={DAY_OPTIONS.map(o => ({ id: o.id, label: o.label }))}
							value={d.dayOfWeek}
							onChange={val => setDays(arr => arr.map(x => x.id === d.id ? { ...x, dayOfWeek: val } : x))}
						/>

						<div className="flex items-center gap-1.5 flex-wrap">
							<button
								type="button"
								onClick={() => duplicateDay(d.id)}
								className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition"
								title={t('actions.duplicateDay', { default: 'Duplicate day' })}
							>
								<CopyPlus className="w-3.5 h-3.5" />
								<span className="hidden sm:inline">{t('actions.duplicateDay', { default: 'Duplicate day' })}</span>
							</button>

							<button
								type="button"
								onClick={() => removeDay(d.id)}
								className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-rose-200 bg-white text-rose-500 hover:bg-rose-50 transition"
								title={t('actions.removeDay')}
							>
								<Trash2 className="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					{/* Day body */}
					<div className="px-4 pt-4 pb-4">
						{renderBlock(d, 'warmup', d.warmupExercises)}
						{renderBlock(d, 'main', d.exercises)}
						{renderBlock(d, 'cardio', d.cardioExercises)}

						{/* Day footer actions */}
						<div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
							{[
								{ key: 'warmup', label: t('builder.addWarmup', { default: '+ Warmup' }), colorClass: 'border-amber-200 text-amber-700 hover:bg-amber-50', show: !(d.warmupExercises?.length) },
								{ key: 'main', label: t('builder.addWorkout', { default: '+ Workout' }), colorClass: 'border-[color:var(--color-primary-200)] text-[color:var(--color-primary-700)] hover:bg-[color:var(--color-primary-50)]', show: !(d.exercises?.length) },
								{ key: 'cardio', label: t('builder.addCardio', { default: '+ Cardio' }), colorClass: 'border-blue-200 text-blue-700 hover:bg-blue-50', show: !(d.cardioExercises?.length) },
							].filter(btn => btn.show).map(btn => (
								<button
									key={btn.key}
									type="button"
									onClick={() => openPicker(d.id, btn.key)}
									className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border bg-white text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 ${btn.colorClass}`}
								>
									{btn.label}
								</button>
							))}
						</div>
					</div>
				</motion.div>
			))}

			{/* Image Preview Overlay */}
			{previewImg && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
					onClick={() => setPreviewImg(null)}
				>
					<div className="max-w-[90vw] max-h-[90vh] p-4">
						<Img
							src={previewImg}
							alt={t('actions.preview')}
							className="max-h-[90vh] h-full max-w-full rounded-lg bg-white"
							onClick={e => e.stopPropagation()}
						/>
					</div>
				</div>
			)}
		</div>
	);
}

/* ─────────────────── MiniField ─────────────────── */
export const MiniField = memo(function MiniField({ cnParent, value, placeholder, inputMode, onChange, onBlur, className = '', type = 'text', iconLeft = null }) {
	const hasValue = String(value ?? '').trim().length > 0;

	return (
		<div className={`relative w-full ${cnParent ?? ''}`}>
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
					'h-8 w-full h-[33px] border px-2 text-xs bg-white outline-none transition placeholder:text-slate-400 rounded-[10px]',
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

/* ─────────────────── MiniTextArea ─────────────────── */
export const MiniTextArea = memo(function MiniTextArea({ value, cnInput, placeholder, onChange, className = '' }) {
	const hasValue = String(value ?? '').trim().length > 0;

	return (
		<div className={`relative !w-[180px] !h-fit ${className}`}>
			{hasValue && (
				<label className="absolute left-2 px-0.5 text-[9px] font-semibold -top-[7px] z-10 text-[color:var(--color-primary-600)] pointer-events-none"
					style={{ background: 'linear-gradient(to bottom, #f8fafc 50%, #ffffff 50%)' }}>
					{placeholder}
				</label>
			)}
			<textarea
				rows={1}
				value={value ?? ''}
				placeholder={placeholder}
				onChange={e => onChange?.(e.target.value)}
				className={[
					cnInput + ' w-full h-[35px] border px-2.5 py-2 text-xs resize-none bg-white outline-none transition placeholder:text-slate-400 rounded-[10px]',
					'focus:ring-2 focus:ring-[color:var(--color-primary-200)] focus:border-[color:var(--color-primary-400)]',
					hasValue
						? 'border-[color:var(--color-primary-300)] hover:border-[color:var(--color-primary-400)]'
						: 'border-slate-200 hover:border-slate-300',
				].join(' ')}
			/>
		</div>
	);
});