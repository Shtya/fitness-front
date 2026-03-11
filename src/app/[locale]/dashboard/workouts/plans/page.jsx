'use client';

import { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import { motion, Reorder } from 'framer-motion';
import {
	Dumbbell,
	Plus,
	Eye,
	PencilLine,
	Trash2,
	Clock,
	Users as UsersIcon,
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
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
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
	const [perPage, setPerPage] = useState(12);
	const [sortBy, setSortBy] = useState('created_at');
	const [sortOrder, setSortOrder] = useState('DESC');
	const [searchText, setSearchText] = useState('');
	const debounced = useDebounced(searchText, 350);

	const [preview, setPreview] = useState(null);
	const [addOpen, setAddOpen] = useState(false);
	const [editRow, setEditRow] = useState(null);
	const [assignOpen, setAssignOpen] = useState(null);

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

	const totalPages = useMemo(() => Math.max(1, Math.ceil(total / Math.max(1, perPage))), [total, perPage]);
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

	return (
		<div className="space-y-6">
			<GradientStatsHeader
				onClick={() => setAddOpen(true)}
				btnName={t('plans.header.newPlanButton')}
				title={t('plans.header.title')}
				desc={t('plans.header.desc')}
				loadingStats={loadingStats}
			>
				{user?.role == 'admin' && (
					<>
						<StatCard icon={Layers} title={t('plans.stats.globalPlans')} value={stats?.plans?.total || 0} />
						<StatCard icon={Layers} title={t('plans.stats.personalPlans')} value={stats?.plans?.totalPlansPersonal || 0} />
					</>
				)}
			</GradientStatsHeader>

			{/* ── Toolbar ── */}
			<div className="flex items-center justify-between gap-3 flex-wrap">
				{/* Search */}
				<div className="relative flex-1 min-w-[220px] max-w-[320px]">
					<Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
					<input
						value={searchText}
						onChange={e => setSearchText(e.target.value)}
						placeholder={t('placeholders.searchPlan')}
						className="h-10 w-full pl-9 pr-8 rtl:pr-9 rtl:pl-8 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 shadow-xs placeholder:text-slate-400 transition focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary-300)] focus:border-[color:var(--color-primary-400)] hover:border-slate-300"
						aria-label={t('placeholders.searchPlan')}
					/>
					{!!searchText && (
						<button
							type="button"
							onClick={() => setSearchText('')}
							className="absolute right-2 rtl:left-2 rtl:right-auto top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					)}
				</div>

				{/* Right controls */}
				<div className="flex items-center gap-2">
					<div className="w-[76px]">
						<Select
							searchable={false}
							clearable={false}
							placeholder={t('plans.filters.perPage')}
							options={[{ id: 8, label: 8 }, { id: 12, label: 12 }, { id: 20, label: 20 }, { id: 30, label: 30 }]}
							value={perPage}
							onChange={n => setPerPage(Number(n))}
						/>
					</div>

					<button
						onClick={() => toggleSort('created_at')}
						className="inline-flex items-center gap-1.5 h-10 rounded-lg px-3 border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary-300)]"
					>
						{sortOrder === 'ASC' ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
						<span>{sortLabel}</span>
					</button>
				</div>
			</div>

			{err && (
				<div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm">
					<span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-500 mt-px" />
					{err}
				</div>
			)}

			<ListView
				loading={loading}
				items={items}
				onPreview={openPreview}
				onEdit={openEdit}
				onDelete={askDelete}
				onAssign={openAssign}
				duplicatingIds={duplicatingIds}
				onDuplicate={handleDuplicate}
			/>

			<PrettyPagination page={page} totalPages={totalPages} onPageChange={setPage} />

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
				{message && <p className="text-sm text-slate-600 leading-relaxed">{message}</p>}
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

/* ─────────────────── LIST VIEW ─────────────────── */
export const ListView = memo(function ListView({ loading, items = [], onPreview, onEdit, onDelete, onAssign, onDuplicate, duplicatingIds }) {
	const t = useTranslations('workoutPlans');
	const user = useUser();

	if (loading) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 5 }).map((_, i) => (
					<div key={i} className="flex items-center gap-4 rounded-lg border border-slate-100 bg-white px-5 py-4">
						<div className="h-10 w-10 rounded-lg bg-slate-100 shimmer shrink-0" />
						<div className="flex-1 space-y-2">
							<div className="h-3.5 w-44 rounded-full bg-slate-100 shimmer" />
							<div className="h-2.5 w-24 rounded-full bg-slate-100 shimmer" />
						</div>
						<div className="h-8 w-32 rounded-lg bg-slate-100 shimmer" />
					</div>
				))}
			</div>
		);
	}

	if (!items.length) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 py-16">
				<div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100">
					<Dumbbell className="h-7 w-7 text-slate-400" />
				</div>
				<div className="text-center space-y-1">
					<h3 className="text-base font-semibold text-slate-800">{t('plans.list.noPlansTitle')}</h3>
					<p className="text-sm text-slate-500 max-w-xs">{t('plans.list.noPlansDesc')}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{items.map((p, idx) => {
				const dayCount = Array.isArray(p?.program?.days) ? p.program.days.length : 0;
				const active = !!p?.isActive;

				return (
					<motion.div
						key={p.id}
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: idx * 0.04, duration: 0.22 }}
						className=" bg-card group relative flex items-center gap-4 rounded-lg border border-slate-100 bg-white px-5 py-3.5 shadow-xs hover:shadow-sm hover:border-slate-200 transition-all duration-200"
					>
						{/* Icon */}
						<div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg theme-gradient-bg text-white shadow-sm">
							<Dumbbell className="h-5 w-5" />
						</div>

						{/* Name + badge */}
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<MultiLangText className="truncate text-sm font-semibold text-slate-900 leading-snug">{p.name}</MultiLangText>
								<span className={[
									'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
									active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-slate-200',
								].join(' ')}>
									<Calendar className="w-3 h-3" />
									{t('plans.list.dayCountLabel', { count: dayCount })}
								</span>
							</div>
						</div>

						{/* Actions */}
<ActionButtons
	row={p}
	actions={[
		{
			icon: <UsersIcon />,
			tooltip: t('actions.assign'),
			variant: 'blue',
			onClick: row => onAssign?.(row),
		},
		{
			icon: <Share2 />,
			tooltip: t('actions.share', { default: 'Share' }),
			variant: 'emerald',
			onClick: row => window.open(`/workouts/plans/${row.id}`, '_blank', 'noopener,noreferrer'),
		},
		{
			icon: duplicatingIds?.has(p.id) ? <Loader2 className="animate-spin" /> : <Layers />,
			tooltip: t('actions.duplicate', { default: 'Duplicate' }),
			variant: 'purple',
			disabled: duplicatingIds?.has(p.id),
			onClick: row => onDuplicate?.(row),
		},
		{
			icon: <Eye />,
			tooltip: t('actions.preview'),
			variant: 'slate',
			onClick: row => onPreview?.(row),
		},
		{
			icon: <PencilLine />,
			tooltip: t('actions.edit'),
			variant: 'amber',
			hidden: p?.adminId == null,
			onClick: row => onEdit?.(row),
		},
		{
			icon: <Trash2 />,
			tooltip: t('actions.delete'),
			variant: 'red',
			hidden: p?.adminId == null,
			onClick: row => onDelete?.(row.id),
		},
	]}
/>

						{/* Actions */}
						{/* <div className="flex items-center gap-1.5 shrink-0">
							<button
								type="button"
								onClick={() => onAssign?.(p)}
								className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-300)]"
								title={t('actions.assign')}
							>
								<UsersIcon className="h-3.5 w-3.5 text-slate-400" />
								{t('actions.assign')}
							</button>

							<div className="w-px h-5 bg-slate-100 mx-0.5" />

							<Link
								href={`/workouts/plans/${p.id}`}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
								title={t('actions.share', { default: 'Share' })}
							>
								<Share2 className="h-3.5 w-3.5" />
							</Link>

							<button
								type="button"
								title={t('actions.duplicate', { default: 'Duplicate' })}
								onClick={() => !duplicatingIds?.has(p.id) && onDuplicate?.(p)}
								disabled={duplicatingIds?.has(p.id)}
								className={[
									'inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-white transition focus-visible:outline-none focus-visible:ring-2',
									'border-[color:var(--color-secondary-200)] text-[color:var(--color-secondary-700)] hover:bg-[color:var(--color-secondary-50)] focus-visible:ring-[color:var(--color-secondary-300)]',
									duplicatingIds?.has(p.id) ? 'opacity-50 pointer-events-none' : '',
								].join(' ')}
							>
								{duplicatingIds?.has(p.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5" />}
							</button>

							<button
								type="button"
								title={t('actions.preview')}
								onClick={() => onPreview?.(p)}
								className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
							>
								<Eye className="h-3.5 w-3.5" />
							</button>

							{p?.adminId != null && (
								<button
									type="button"
									title={t('actions.edit')}
									onClick={() => onEdit?.(p)}
									className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--color-primary-200)] bg-white text-[color:var(--color-primary-600)] hover:bg-[color:var(--color-primary-50)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-300)]"
								>
									<PencilLine className="h-3.5 w-3.5" />
								</button>
							)}

							{p?.adminId != null && (
								<button
									type="button"
									title={t('actions.delete')}
									onClick={() => onDelete?.(p.id)}
									className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-500 hover:bg-rose-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
								>
									<Trash2 className="h-3.5 w-3.5" />
								</button>
							)}
						</div> */}
					</motion.div>
				);
			})}
		</div>
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
														<MultiLangText className="text-xs font-semibold text-slate-900 truncate leading-snug">{ex.name}</MultiLangText>
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
		<div className="space-y-5 py-1">
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

			{/* Footer actions */}
			<div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
				<button
					type="button"
					onClick={onCancel}
					className="inline-flex items-center justify-center h-10 px-5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 active:scale-[.97] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
				>
					{t('actions.cancel')}
				</button>
				<Button name={t('builder.savePlanBtn')} loading={loading} type="button" onClick={submit} className="!w-fit !h-10 text-sm" />
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

				{list?.length ? (
					<Reorder.Group
						axis="y"
						values={list}
						onReorder={newOrder => onReorderExercises(day.id, block, newOrder)}
						className="space-y-2"
					>
						{list.map(ex => (
							<Reorder.Item
								key={ex.exerciseId}
								value={ex}
								dragListener
								dragConstraints={{ top: 0, bottom: 0 }}
								className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:border-slate-300 hover:shadow-xs transition-all cursor-default"
							>
								<div className="flex items-center gap-3">
									{/* Drag + image */}
									<div className=" flex items-center gap-2 shrink-0 mt-0.5">
										<GripVertical className="w-3.5 h-3.5 text-slate-300 cursor-grab hover:text-slate-400 transition shrink-0" />
										<div className="relative w-11 h-11 group shrink-0">
											<Img src={ex?.img} showBlur={false} className="w-full h-full rounded-lg object-contain bg-slate-50 border border-slate-100" />
											<button
												type="button"
												onClick={() => setPreviewImg(ex.img)}
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

									{/* Info + fields */}
									<div className="flex-1 ">
										{!isCardio && (
											<div className=" justify-end flex items-center gap-2 flex-1">
												<div className="max-w-[400px] w-full grid grid-cols-4 gap-1.5">
													<MiniField inputMode="numeric" type="number" placeholder={t('preview.sets')} value={ex.targetSets ?? ''} onChange={e => setExerciseField(ex.exerciseId, { targetSets: e.target.value })} onBlur={() => { if (String(ex.targetSets ?? '').trim()) setExerciseField(ex.exerciseId, { targetSets: normalizeIntOrDefault(ex.targetSets, 3) }); }} />
													<MiniField inputMode="numeric" placeholder={t('preview.reps')} value={ex.targetReps ?? ''} onChange={e => setExerciseField(ex.exerciseId, { targetReps: e.target.value })} onBlur={() => { if (String(ex.targetReps ?? '').trim()) setExerciseField(ex.exerciseId, { targetReps: normalizeIntOrDefault(ex.targetReps, 12) }); }} />
													<MiniField placeholder={t('preview.tempo', { default: 'Tempo' })} value={ex.tempo ?? ''} onChange={e => setExerciseField(ex.exerciseId, { tempo: e.target.value })} onBlur={() => { if (String(ex.tempo ?? '').trim()) setExerciseField(ex.exerciseId, { tempo: normalizeTempoOrDefault(ex.tempo, '1/1/1') }); }} />
													<MiniField inputMode="numeric" type="number" placeholder={t('builder.restTime')} value={ex.restSeconds ?? ''} onChange={e => setExerciseField(ex.exerciseId, { restSeconds: e.target.value })} onBlur={() => { if (String(ex.restSeconds ?? '').trim()) setExerciseField(ex.exerciseId, { restSeconds: normalizeIntOrDefault(ex.restSeconds, 90) }); }} />
												</div>
												<MiniTextArea className=" mb-[-6px] max-w-[200px] " placeholder={t('builder.exerciseNote', { default: 'Note for this exercise...' })} value={ex.note ?? ''} onChange={val => setExerciseField(ex.exerciseId, { note: val })} />
												<button
													type="button"
													onClick={() => removeExercise(ex.exerciseId)}
													className=" mb-[2px] shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition"
													title={t('actions.delete')}
												>
													<Trash2 className="w-3.5 h-3.5" />
												</button>
											</div>
										)}

										{/* Cardio fields */}
										{isCardio && (
											<div className="flex items-start justify-end gap-2">
												<div className="flex border border-slate-200  bg-white shrink-0">
													{/* Unit toggle */}
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
																	setExerciseField(ex.exerciseId, { durationUnit: unit, durationValue: newVal });
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
													{/* Duration input */}
													<MiniField
														inputMode="numeric"
														type="number"
														placeholder={ex.durationUnit === 'sec' ? t('builder.cardio.seconds') : t('builder.cardio.minutes', { default: 'Min' })}
														value={ex.durationValue ?? ''}
														onChange={e => setExerciseField(ex.exerciseId, { durationValue: e.target.value })}
														onBlur={() => setExerciseField(ex.exerciseId, { durationValue: normalizeMinutesOrEmpty(ex.durationValue) })}
														iconLeft={<Clock className="w-3 h-3 text-slate-400" />}
														className=" !max-w-[100px] !rounded-none !border-0 !h-[35px] w-28"
													/>
												</div>
												<MiniTextArea
													placeholder={t('builder.cardio.note')}
													value={ex.note ?? ''}
													onChange={val => setExerciseField(ex.exerciseId, { note: val })}
													className="flex-1 max-w-[300px]"
													cnInput=" !h-[38px] !rounded-none"
												/>
											</div>
										)}
									</div>
								</div>
							</Reorder.Item>
						))}
					</Reorder.Group>
				) : (
					<div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-5 text-center">
						<p className="text-xs text-slate-400">{t('builder.noExercisesHint')}</p>
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
							{[
								{ key: 'warmup', label: t('builder.addWarmup', { default: '+ Warmup' }), colorClass: 'border-amber-200 text-amber-700 hover:bg-amber-50' },
								{ key: 'main', label: t('builder.addWorkout', { default: '+ Workout' }), colorClass: 'border-[color:var(--color-primary-200)] text-[color:var(--color-primary-700)] hover:bg-[color:var(--color-primary-50)]' },
								{ key: 'cardio', label: t('builder.addCardio', { default: '+ Cardio' }), colorClass: 'border-blue-200 text-blue-700 hover:bg-blue-50' },
							].map(btn => (
								<button
									key={btn.key}
									type="button"
									onClick={() => openPicker(d.id, btn.key)}
									className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border bg-white text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 ${btn.colorClass}`}
								>
									{btn.label}
								</button>
							))}

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
					<div className="px-4 pt-4 pb-3">
						{renderBlock(d, 'warmup', d.warmupExercises)}
						{renderBlock(d, 'main', d.exercises)}
						{renderBlock(d, 'cardio', d.cardioExercises)}
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
					'h-8 w-full h-[33px] border px-2 text-xs bg-white outline-none transition placeholder:text-slate-400',
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
		<div className={`relative w-full !h-fit ${className}`}>
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
					cnInput + '  w-full  h-[35px] border px-2.5 py-2 text-xs resize-none bg-white outline-none transition placeholder:text-slate-400',
					'focus:ring-2 focus:ring-[color:var(--color-primary-200)] focus:border-[color:var(--color-primary-400)]',
					hasValue
						? 'border-[color:var(--color-primary-300)] hover:border-[color:var(--color-primary-400)]'
						: 'border-slate-200 hover:border-slate-300',
				].join(' ')}
			/>
		</div>
	);
});