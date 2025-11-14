'use client';

import { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import { motion, Reorder } from 'framer-motion';
import { Dumbbell, Plus, Eye, PencilLine, Trash2, Clock, Users as UsersIcon, X, Layers, Search, Tag, GripVertical, UserCheck, Users, CalendarX, Loader2 } from 'lucide-react';

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

// Normalize any plan shape -> POST /plans payload
function buildPayloadFromPlan(sourcePlan, { userId, nameSuffix = ' (copy)', isActive = true } = {}) {
	const srcDays = sourcePlan?.program?.days || sourcePlan?.days || [];
	const safeName = (sourcePlan?.name || 'Plan') + nameSuffix;

	const days = srcDays.map((d, i) => ({
		dayOfWeek: String(d.dayOfWeek || d.day || 'saturday').toLowerCase(),
		nameOfWeek: d.nameOfWeek || d.name || `Day #${i + 1}`,
		exercises: (d.exercises || []).map((ex, idx) => ({
			order: ex.order || ex.orderIndex || idx + 1,
			exerciseId: ex.exerciseId || ex?.exercise?.id || ex?.id,
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


/* =============================== PAGE ROOT =============================== */
export default function PlansPage() {
	const t = useTranslations('workoutPlans');
	const user = useUser();

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

	const clients = useAdminClients(user?.id, { page: 1, limit: 100, search: '' });

	const optionsClient = useMemo(() => {
		const list = [];
		if (clients?.items?.length) {
			for (const coach of clients.items) {
				list.push({
					id: coach.id,
					label: coach.name,
				});
			}
		}
		return list;
	}, [user, clients?.items]);

	const reqId = useRef(0);
	const abortControllerRef = useRef(null);

	const fetchList = useCallback(async () => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}

		abortControllerRef.current = new AbortController();
		setErr(null);
		setLoading(true);

		const myId = ++reqId.current;
		try {
			const params = { page, limit: perPage, sortBy, sortOrder };
			if (debounced) params.search = debounced;

			const res = await api.get(user?.role == "admin" ? '/plans' : `/plans?user_id=${user?.adminId}`, {
				params,
				signal: abortControllerRef.current.signal,
			});
			const data = res.data || {};

			let records = [];
			let totalRecords = 0;
			let serverPerPage = perPage;

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
			if (e.name === 'CanceledError') return;
			if (myId !== reqId.current) return;
			setErr(e?.response?.data?.message || t('errors.loadPlans', 'Failed to load plans'));
		} finally {
			if (myId === reqId.current) setLoading(false);
		}
	}, [page, debounced, sortBy, sortOrder, perPage, t]);

	const fetchStats = useCallback(async () => {
		setLoadingStats(true);
		try {
			const params = {};
			if (debounced) params.search = debounced;
			const res = await api.get('/plans/overview', { params });
			setStats(res.data);
		} catch {
			// ignore
		} finally {
			setLoadingStats(false);
		}
	}, [debounced]);

	useEffect(() => {
		setPage(1);
	}, [debounced, sortBy, sortOrder, perPage]);

	useEffect(() => {
		fetchList();
	}, [changePlans, fetchList]);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	useEffect(() => {
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
		};
	}, []);

	const toggleSort = useCallback(
		field => {
			if (sortBy === field) {
				setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
			} else {
				setSortBy(field);
				setSortOrder('ASC');
			}
		},
		[sortBy],
	);

	const getOne = async id => (await api.get(`/plans/${id}`)).data;

	/* ----------------------------- CRUD Handlers ---------------------------- */
	const [deleteId, setDeleteId] = useState(null);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);

	const askDelete = useCallback(id => {
		setDeleteId(id);
		setDeleteOpen(true);
	}, []);

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

	const createPlan = async payload => {
		// payload already has userId injected in NewPlanBuilder
		const res = await api.post('/plans', payload, { headers: { 'Content-Type': 'application/json' } });
		return res.data;
	};

	const updatePlan = async (id, payload) => {
		const res = await api.put(`/plans/${id}`, payload, { headers: { 'Content-Type': 'application/json' } });
		return res.data;
	};

	const openPreview = async plan => {
		try {
			setPreview(await getOne(plan.id));
		} catch {
			setPreview(plan);
		}
	};

	const openEdit = async plan => {
		try {
			setEditRow(await getOne(plan.id));
		} catch {
			setEditRow(plan);
		}
	};

	const openAssign = plan => setAssignOpen(plan);
	const totalPages = useMemo(() => Math.max(1, Math.ceil(total / Math.max(1, perPage))), [total, perPage]);
	const sortLabel = sortBy === 'created_at' ? (sortOrder === 'ASC' ? t('plans.filters.oldestFirst') : t('plans.filters.newestFirst')) : t('plans.filters.sortByDate');


	const [duplicatingIds, setDuplicatingIds] = useState(() => new Set());
	const markDuplicating = useCallback((id, on) => {
		setDuplicatingIds(prev => {
			const next = new Set(prev);
			on ? next.add(id) : next.delete(id);
			return next;
		});
	}, []);


	const handleDuplicate = useCallback(async (plan) => {
		if (!plan?.id) return;
		markDuplicating(plan.id, true);
		try {
			// fetch full plan to ensure we have program.days
			const full = await getOne(plan.id).catch(() => plan);

			const payload = buildPayloadFromPlan(full, {
				userId: user?.id,
				nameSuffix: ` ${t('copySuffix', '(copy)')}`,
				isActive: full?.isActive ?? true,
			});

			const created = await createPlan(payload);

			// optimistic UI: prepend & increase total
			setItems(arr => [created, ...arr]);
			setTotal(tot => tot + 1);

			Notification(t('notifications.planDuplicated', 'Plan duplicated. You can edit it now.'), 'success');

			// open the edit modal so you can rename/tweak immediately
			setEditRow(created);
		} catch (e) {
			const msg = e?.response?.data?.message || t('notifications.duplicateFailed', 'Could not duplicate plan');
			Notification(msg, 'error');
		} finally {
			markDuplicating(plan.id, false);
		}
	}, [user?.id, t, markDuplicating]);

	return (
		<div className='space-y-6'>
			{/* Header / Stats */}
			<GradientStatsHeader onClick={() => setAddOpen(true)} btnName={user?.role == "admin" && t('plans.header.newPlanButton')} title={t('plans.header.title')} desc={t('plans.header.desc')} loadingStats={loadingStats}>
				{
					user?.role == "admin" && <>
						<StatCard className=' ' icon={Layers} title={t('plans.stats.globalPlans')} value={stats?.plans?.total || 0} />
						<StatCard className=' ' icon={Layers} title={t('plans.stats.personalPlans')} value={stats?.plans?.totalPlansPersonal || 0} />
					</>
				}
			</GradientStatsHeader>

			{/* Filters + search */}
			<div className='relative '>
				<div className='flex items-center justify-between gap-2 flex-wrap'>
					{/* Search */}
					<div className='relative flex-1 max-w-[240px] sm:min-w-[260px]'>
						<Search className='absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
						<input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder={t('placeholders.search')} className={['h-11 w-full px-8 rounded-lg', 'border border-slate-200 bg-white/90 text-slate-900', 'shadow-sm hover:shadow transition', 'focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200/40'].join(' ')} aria-label={t('placeholders.search')} />
						{!!searchText && (
							<button type='button' onClick={() => setSearchText('')} className='absolute rtl:left-2 ltr:right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100' aria-label={t('actions.clear')} title={t('actions.clear')}>
								<X className='w-4 h-4' />
							</button>
						)}
					</div>

					<div className='flex items-center gap-2'>
						{/* Per page */}
						<div className='min-w-[130px]'>
							<Select
								className='!w-full'
								placeholder={t('plans.filters.perPage')}
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

						{/* Sort newest */}
						<button onClick={() => toggleSort('created_at')} className={['inline-flex items-center gap-2 rounded-lg px-3 h-11 font-medium transition-all duration-300', 'border border-slate-200 bg-white/95 text-slate-800 shadow-sm', 'hover:shadow-md hover:bg-slate-50 active:scale-[.97]', 'focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200/40'].join(' ')}>
							<Clock size={18} />
							<span className='text-sm tracking-wide'>{sortLabel}</span>
						</button>
					</div>
				</div>
			</div>

			{/* Errors */}
			{err ? <div className='p-3 rounded-lg bg-red-50 text-red-700 border border-red-100'>{err}</div> : null}

			{/* Content */}
			<ListView loading={loading} items={items} onPreview={openPreview} onEdit={openEdit} onDelete={askDelete} onAssign={openAssign} duplicatingIds={duplicatingIds} onDuplicate={handleDuplicate} />

			<PrettyPagination page={page} totalPages={totalPages} onPageChange={setPage} />

			{/* Preview */}
			<Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || t('plans.modals.previewTitle')} maxW='max-w-4xl'>
				{preview && <PlanPreview plan={preview} />}
			</Modal>

			{/* New Plan Builder */}
			<Modal open={addOpen} onClose={() => setAddOpen(false)} title={t('plans.modals.createTitle')} maxW='max-w-5xl'>
				<NewPlanBuilder
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

			{/* Edit */}
			<Modal open={!!editRow} onClose={() => setEditRow(null)} title={`${t('plans.modals.editTitle')} ${editRow?.name || ''}`} maxW='max-w-5xl'>
				{editRow && (
					<NewPlanBuilder
						userId={user?.id}
						initial={editRow}
						onCancel={() => setEditRow(null)}
						onCreate={async payload => {
							try {
								const saved = await updatePlan(editRow.id, payload);
								setItems(arr => arr.map(p => (p.id === editRow.id ? saved : p)));
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

			{/* Assign */}
			<Modal open={!!assignOpen} onClose={() => setAssignOpen(null)} title={t('plans.modals.assignTitle', { name: assignOpen?.name || '' })} maxW='max-w-md'>
				{assignOpen && <AssignForm setChangePlans={setChangePlans} setPlans={setItems} plans={items} planId={assignOpen.id} optionsClient={optionsClient} onClose={() => setAssignOpen(null)} onAssigned={() => setAssignOpen(null)} />}
			</Modal>

			{/* Delete confirmation */}
			<ConfirmDialog
				loading={deleteLoading}
				open={deleteOpen}
				onClose={() => {
					setDeleteOpen(false);
					setDeleteId(null);
				}}
				title={t('confirm.deletePlanTitle')}
				message={t('confirm.deletePlanMsg')}
				confirmText={t('confirm.confirmBtn')}
				onConfirm={handleDelete}
			/>
		</div>
	);
}

/* ---------------------------- Subcomponents ---------------------------- */
const ConfirmDialog = memo(function ConfirmDialog({ open, onClose, loading, title, message, onConfirm, confirmText }) {
	const t = useTranslations('workoutPlans');
	return (
		<Modal open={open} onClose={onClose} title={title || t('confirm.titleDefault')} maxW='max-w-md'>
			<div className='space-y-4'>
				{message ? <p className='text-sm text-slate-600'>{message}</p> : null}
				<div className='flex items-center justify-end gap-2'>
					<Button
						name={confirmText || t('confirm.confirmBtn')}
						loading={loading}
						color='danger'
						className='!w-fit'
						onClick={() => {
							onConfirm?.();
							onClose?.();
						}}
					/>
				</div>
			</div>
		</Modal>
	);
});

/* ================================ LIST VIEW ================================ */
export const ListView = memo(function ListView({ loading, items = [], onPreview, onEdit, onDelete, onAssign, onDuplicate, duplicatingIds }) {
	const t = useTranslations('workoutPlans');
	const user = useUser()
	/* ---------- Loading (skeleton list) ---------- */
	if (loading) {
		return (
			<div className='divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
				{Array.from({ length: 6 }).map((_, i) => (
					<div key={i} className='group relative flex items-center gap-3 px-4 py-3'>
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

	/* ---------- Empty ---------- */
	if (!items.length) {
		return (
			<div className='rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm'>
				<div className='mx-auto grid h-16 w-16 place-content-center rounded-lg bg-slate-100'>
					<Dumbbell className='h-8 w-8 text-slate-500' />
				</div>
				<h3 className='mt-4 text-lg font-semibold text-slate-900'>{t('plans.list.noPlansTitle')}</h3>
				<p className='mt-1 text-sm text-slate-600'>{t('plans.list.noPlansDesc')}</p>
			</div>
		);
	}

	/* ---------- List ---------- */
	return (
		<div className='divide-y flex flex-col gap-3 divide-slate-100 overflow-hidden '>
			{items.map(p => {
				const dayCount = Array.isArray(p?.program?.days) ? p.program.days.length : 0;
				const active = !!p?.isActive;

				return (
					<div key={p.id} className='rounded-lg border border-y-slate-200 bg-white  group relative flex items-start gap-3 px-4 py-3 transition-all duration-300 hover:bg-slate-50/60'>

						{/* icon tile */}
						<div className='mt-0.5 grid h-8 w-8 shrink-0 place-content-center rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-95 text-white shadow-sm'>
							<Dumbbell className='h-5 w-5' />
						</div>

						{/* content */}
						<div className='min-w-0 flex-1'>
							<div className='flex flex-wrap items-center gap-2'>
								<MultiLangText className='truncate text-base font-semibold text-slate-900'>{p.name}</MultiLangText>
								<span className={['inline-flex items-center gap-1 rounded-md px-2 py-0.5   ring-1 ring-inset', active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'].join(' ')}>{t('plans.list.dayCountLabel', { count: dayCount })}</span>
							</div>
						</div>

						{/* actions */}
						<div className="ml-auto flex shrink-0 items-center gap-1">
							{/* Assign */}
							{user?.role === "admin" && (
								<button
									type="button"
									onClick={() => onAssign?.(p)}
									className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-all hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30 active:scale-[.98]"
									title={t("actions.assign")}
								>
									<UsersIcon className="h-4 w-4" />
									{t("actions.assign")}
								</button>
							)}

							<div className="flex items-center gap-2">
								{/* Public View */}
								<Link
									href={`/workouts/plans/${p.id}`}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/30"
								>
									<Eye className="h-4 w-4" />
									<span>{t("actions.view")}</span>
								</Link>

								{/* Preview */}
								<button
									type="button"
									title={t("actions.preview")}
									onClick={() => onPreview?.(p)}
									className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30"
								>
									<Eye className="h-4 w-4" />
								</button>

								{/* Edit */}
								<button
									type="button"
									title={t("actions.edit")}
									onClick={() => onEdit?.(p)}
									className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/30"
								>
									<PencilLine className="h-4 w-4" />
								</button>

								{/* Delete */}
								<button
									type="button"
									title={t("actions.delete")}
									onClick={() => onDelete?.(p.id)}
									className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300/30"
								>
									<Trash2 className="h-4 w-4" />
								</button>

								{/* Duplicate */}
								<button
									type="button"
									title={t('actions.duplicate', { default: 'Duplicate' })}
									onClick={() => !duplicatingIds?.has(p.id) && onDuplicate?.(p)}
									disabled={duplicatingIds?.has(p.id)}
									aria-busy={duplicatingIds?.has(p.id) ? 'true' : 'false'}
									className={[
										"inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white focus-visible:outline-none focus-visible:ring-4 transition",
										"border-violet-200 text-violet-700 hover:bg-violet-50 focus-visible:ring-violet-300/30",
										duplicatingIds?.has(p.id) ? "opacity-60 pointer-events-none cursor-not-allowed" : ""
									].join(' ')}>
									{duplicatingIds?.has(p.id)
										? <Loader2 className="h-4 w-4 animate-spin" />
										: <Layers className="h-4 w-4" />}
								</button>
							</div>
						</div>

					</div>
				);
			})}
		</div>
	);
});

const PlanPreview = memo(function PlanPreview({ plan }) {
	const t = useTranslations('workoutPlans');
	return (
		<div className='space-y-6'>
			<div className='space-y-4 '>
				{(plan?.program?.days || []).map((d, idx) => (
					<div key={d.id || idx} className=''>
						<div className='rounded-[6px_6px_0_0] border border-slate-200 bg-white px-4 py-3 border-b  flex items-center justify-between'>
							<MultiLangText className='font-semibold'>{d.name}</MultiLangText>
							<MultiLangText className='text-xs text-slate-500'>{String(d.day || d.dayOfWeek || '').toLowerCase()}</MultiLangText>
						</div>
						<div className=' p-2 bg-gray-50 rounded-[0_0_6px_6px]'>
							{(d.exercises || []).length ? (
								<ol className="grid grid-cols-2 gap-4">
									{d.exercises.map((ex, i) => (
										<li
											key={ex.id || ex.exerciseId || i}
											className="relative flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm "
										>
											{/* Number Badge */}
											<span className="absolute -top-[2px] rtl:-right-[2px] z-[10] ltr:-left-[2px] flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500 text-[11px] font-semibold text-white shadow-md">
												{i + 1}
											</span>

											{/* Image */}
											<div className="w-fit">
												<Img
													showBlur={false}
													src={ex.img}
													alt={ex.name}
													className="h-18 !w-18 rounded-md object-contain bg-slate-50"
												/>
											</div>

											{/* Text Content */}
											<div className="flex w-full flex-col">
												<MultiLangText className="text-base font-semibold text-slate-800 leading-tight">
													{ex.name}
												</MultiLangText>

												{(ex.targetSets || ex.targetReps) && (
													<p className="text-sm text-slate-500 font-en">
														{ex.targetSets ? `${ex.targetSets} sets` : ""}{" "}
														{ex.targetReps ? `x ${ex.targetReps} reps` : ""}
													</p>
												)}
											</div>
										</li>
									))}
								</ol>
							) : (
								<div className="text-xs text-slate-400">{t("preview.noExercisesYet")}</div>
							)}

						</div>
					</div>
				))}
			</div>

			<div className='text-[11px] text-slate-500 border-t border-slate-100 pt-3'>
				{t('preview.createdAt')} {plan.created_at ? new Date(plan.created_at).toLocaleString() : '—'} · {t('preview.updatedAt')} {plan.updated_at ? new Date(plan.updated_at).toLocaleString() : '—'}
			</div>
		</div>
	);
});

/* ================================ ASSIGN ================================= */
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

			await api.post(`/plans/${planId}/assign`, {
				athleteIds,
				isActive: true,
				confirm: 'yes',
			});

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
		<form onSubmit={submit} className='space-y-4'>
			<div>
				<label className='text-sm font-medium text-slate-700 mb-2 block'>{t('assign.selectUsersLabel')}</label>
				<Select placeholder={t('assign.selectUsersPlaceholder')} options={optionsClient.filter(o => !selectedUsers.some(u => u.id === o.id))} value={null} onChange={addUser} searchable={true} />
			</div>

			{selectedUsers.length > 0 && (
				<div className='flex flex-wrap gap-2'>
					{selectedUsers.map(user => (
						<span key={user.id} className='inline-flex items-center gap-2 rounded-lg bg-indigo-100 text-indigo-700 text-sm px-3 py-1.5 border border-indigo-200'>
							{user.label}
							<button type='button' onClick={() => removeUser(user.id)} className='hover:text-indigo-900 transition-colors' aria-label={t('assign.removeUser')}>
								<X className='w-3 h-3' />
							</button>
						</span>
					))}
				</div>
			)}

			<div className='flex items-center justify-end gap-2 pt-2'>
				<Button onClick={onClose} type='button' color='outline' name={t('actions.cancel')} />
				<Button disabled={submitting || selectedUsers.length === 0} type='submit' color='primary' name={submitting ? t('assign.assigning') : t('actions.assign')} loading={submitting} />
			</div>
		</form>
	);
});

/* ============================ NEW PLAN BUILDER ============================ */
const NewPlanBuilder = memo(function NewPlanBuilder({ initial, onCancel, onCreate, userId }) {
	const t = useTranslations('workoutPlans');

	const [name, setName] = useState(initial?.name || '');
	const [notes, setNotes] = useState(initial?.notes || '');

	// helper to create a blank day starting on Saturday
	const makeNewDay = idx => ({
		id: `day_${Date.now()}_${idx}`,
		dayOfWeek: 'saturday',
		nameOfWeek: t('builder.dayNumber', { num: idx }),
		exercises: [],
	});

	const [days, setDays] = useState(() => {
		const d = initial?.days || initial?.program?.days || [];
		const mapped = d.map((x, i) => ({
			id: x.id || `day_${i}`,
			dayOfWeek: (x.day || x.dayOfWeek || '').toLowerCase() || 'saturday',
			nameOfWeek: x.nameOfWeek || x.name || t('builder.dayNumber', { num: i + 1 }),
			exercises: (x.exercises || []).map((e, j) => ({
				exerciseId: e.exerciseId || e.exercise?.id || e.id,
				name: e.name || e.exercise?.name || `${t('preview.exerciseLabel')} #${j + 1}`,
				category: e.exercise?.category || e.category || null,
				order: e.order || e.orderIndex || j + 1,
			})),
		}));

		// if editing existing plan with days -> use them
		if (mapped.length > 0) return mapped;

		// NEW plan → start with one default day (Saturday)
		return [makeNewDay(1)];
	});

	const addDay = () => {
		setDays(arr => {
			const idx = arr.length + 1;
			return [...arr, makeNewDay(idx)];
		});
	};

	const removeDay = id => setDays(arr => arr.filter(d => d.id !== id));

	const [pickerOpen, setPickerOpen] = useState(false);
	const [pickerDayId, setPickerDayId] = useState(null);
	const pickerInitialSelected = useMemo(() => {
		const day = days.find(d => d.id === pickerDayId);
		if (!day) return [];
		return day.exercises.map(ex => ({
			id: ex.exerciseId,
			name: ex.name,
			category: ex.category || null,
		}));
	}, [pickerDayId, days]);

	const openPicker = dayId => {
		setPickerDayId(dayId);
		setPickerOpen(true);
	};

	const onPickerDone = pickedArray => {
		// pickedArray = [{ id, name, category }, ...] from ExercisePicker (only currently checked)

		setDays(arr =>
			arr.map(day => {
				if (day.id !== pickerDayId) return day;

				// what user wants to end up with in this day
				const pickedIds = pickedArray.map(x => x.id);

				// 1. keep only exercises that are STILL selected in the picker
				const keptExisting = day.exercises.filter(ex => pickedIds.includes(ex.exerciseId));

				// 2. find which picked ones are NEW (not already in day.exercises)
				const existingIdsSet = new Set(day.exercises.map(ex => ex.exerciseId));
				const newOnes = pickedArray
					.filter(x => !existingIdsSet.has(x.id))
					.map(x => ({
						exerciseId: x.id,
						name: x.name,
						category: x.category || null,
					}));

				// 3. merge kept + new, and fix order
				const merged = [...keptExisting, ...newOnes].map((ex, idx) => ({
					...ex,
					order: idx + 1,
				}));

				return { ...day, exercises: merged };
			}),
		);

		setPickerOpen(false);
		setPickerDayId(null);
	};

	const onReorderExercises = (dayId, newOrder) => {
		setDays(arr =>
			arr.map(d => {
				if (d.id !== dayId) return d;
				const reordered = newOrder.map((ex, idx) => ({ ...ex, order: idx + 1 }));
				return { ...d, exercises: reordered };
			}),
		);
	};

	const [loading, setLoading] = useState(false);

	const submit = async () => {
		if (!name.trim()) {
			Notification(t('builder.validation.nameRequired'), 'error');
			return;
		}
		if (!days.length) {
			Notification(t('builder.validation.needDay'), 'error');
			return;
		}
		if (days.some(d => !d.exercises.length)) {
			Notification(t('builder.validation.needExercisePerDay'), 'error');
			return;
		}

		const payload = {
			userId: userId || null,
			name: name.trim(),
			isActive: true,
			notes: notes || null,
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
		setLoading(true);
		await onCreate?.(payload);
		setLoading(false);
	};

	// Days of the week start with Saturday
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
		<div className='space-y-4 py-1'>
			<div className='flex items-center justify-between pb-2 border-b border-slate-100'>
				<Input className='max-w-[400px] w-full' placeholder={t('builder.namePlaceholder')} value={name} onChange={e => setName(e)} />

				<button type='button' onClick={addDay} className='inline-flex items-center gap-2 rounded-lg border border-slate-300  bg-white px-4 py-2 text-sm font-medium text-slate-800  shadow-sm hover:bg-slate-50 active:scale-[.97]  focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30  transition-all duration-200'>
					<Plus className='w-4 h-4 text-slate-700' />
					<span>{t('actions.addDay')}</span>
				</button>
			</div>

			<DaysListSection days={days} setDays={setDays} openPicker={openPicker} removeDay={removeDay} onReorderExercises={onReorderExercises} DAY_OPTIONS={DAY_OPTIONS} spring={spring} />

			<div className='flex items-center justify-end gap-3 pt-4 border-t border-slate-100'>
				<button type='button' onClick={onCancel} className='inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300  bg-white px-4 py-2.5 text-sm font-medium text-slate-700  shadow-sm hover:bg-slate-50 active:scale-[.97]  focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30  transition-all duration-200'>
					{t('actions.cancel')}
				</button>

				<Button name={t('builder.savePlanBtn')} loading={loading} type='button' onClick={submit} className='!w-fit text-sm !h-[39px]'></Button>
			</div>

			{/* Full-screen Exercise Picker */}
			<ExercisePicker
				open={pickerOpen}
				dayId={pickerDayId} // 👈 NEW
				initialSelected={pickerInitialSelected} // 👈 NEW
				onClose={() => {
					setPickerOpen(false);
					setPickerDayId(null);
				}}
				onDone={onPickerDone}
			/>
		</div>
	);
});

export function DaysListSection({ days, setDays, openPicker, removeDay, onReorderExercises, DAY_OPTIONS, spring }) {
	const t = useTranslations('workoutPlans');

	const btnBase = ' h-[35px] inline-flex items-center justify-center gap-2 rounded-lg text-sm transition ' + 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30 active:scale-[.98]';
	const btnOutline = 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 px-3 py-1.5 shadow-sm';
	const btnGhostDanger = 'border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 px-2.5 py-1.5';
	const iconBtn = 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white ' + 'text-slate-700 hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-slate-400/30';

	return (
		<div className='space-y-4'>
			{days.map(d => (
				<motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='overflow-hidden rounded-lg border border-slate-200 bg-white'>
					{/* Header row */}
					<div className='flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3'>
						<div className='flex flex-wrap items-center gap-3'>
							<div className='font-semibold text-slate-900 uppercase  '>{d.nameOfWeek}</div>
							<Select
								className='!w-[160px]'
								placeholder={t('builder.selectDayPlaceholder')}
								options={DAY_OPTIONS.map(o => ({ id: o.id, label: o.label }))}
								value={d.dayOfWeek}
								onChange={val => {
									setDays(arr => arr.map(x => (x.id === d.id ? { ...x, dayOfWeek: val } : x)));
								}}
								searchable={false}
							/>
						</div>

						<div className='flex items-center gap-2'>
							{/* Add exercises */}
							<button type='button' onClick={() => openPicker(d.id)} className={`${btnBase} ${btnOutline} !px-3 !py-1.5`} title={t('actions.addExercises')}>
								<Plus className='w-4 h-4' />
								{t('actions.addExercises')}
							</button>

							{/* Remove day */}
							<button type='button' onClick={() => removeDay(d.id)} className={`${btnBase} ${btnGhostDanger}`} title={t('actions.removeDay')}>
								<Trash2 className='w-4 h-4' />
							</button>
						</div>
					</div>

					{/* Body */}
					<div className='p-4'>
						{d.exercises.length ? (
							<Reorder.Group axis='y' values={d.exercises} onReorder={newOrder => onReorderExercises(d.id, newOrder)} className='space-y-2'>
								{d.exercises.map(ex => (
									<Reorder.Item key={ex.exerciseId} value={ex} dragListener dragConstraints={{ top: 0, bottom: 0 }} className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition-colors hover:bg-slate-100'>
										<div className='flex items-center justify-between gap-3'>
											<div className='flex min-w-0 items-center gap-3'>
												<GripVertical className='w-4 h-4 shrink-0 cursor-grab text-slate-400' />
												<MultiLangText className='truncate font-medium text-slate-900'>{ex.name}</MultiLangText>
												{ex.category ? (
													<span className='inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] text-indigo-700'>
														<Tag size={12} />
														<MultiLangText>{ex.category}</MultiLangText>
													</span>
												) : null}
											</div>

											{/* Remove exercise */}
											<button
												type='button'
												onClick={() =>
													setDays(arr =>
														arr.map(x =>
															x.id === d.id
																? {
																	...x,
																	exercises: x.exercises.filter(e => e.exerciseId !== ex.exerciseId),
																}
																: x,
														),
													)
												}
												className={iconBtn}
												title={t('actions.delete')}>
												<Trash2 className='w-4 h-4' />
											</button>
										</div>
									</Reorder.Item>
								))}
							</Reorder.Group>
						) : (
							<div className='rounded-lg border border-dashed border-slate-200 bg-slate-50 py-6 text-center text-sm text-slate-500'>{t('builder.noExercisesHint')}</div>
						)}
					</div>
				</motion.div>
			))}
		</div>
	);
}
