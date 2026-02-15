/* 

*/

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

const toMinutesFromSeconds = (secs) => {
	const n = Number(secs);
	if (!Number.isFinite(n) || n <= 0) return '';
	return String(Math.round(n / 60));
};

const toSecondsFromMinutes = (mins) => {
	const s = String(mins ?? '').trim();
	if (!s) return null;
	const n = Number(s);
	if (!Number.isFinite(n) || n <= 0) return null;
	return Math.trunc(n) * 60;
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
		})),
		exercises: (d.exercises || []).map((ex, idx) => ({
			order: ex.order || ex.orderIndex || idx + 1,
			exerciseId: ex.exerciseId || ex?.exercise?.id || ex?.id,
			targetSets: ex.targetSets ?? 3,
			targetReps: ex.targetReps ?? 12,
			tempo: ex.tempo ?? '1/1/1',
		})),

		// ✅ CARDIO: time + note only
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
		} catch {
			// ignore
		} finally {
			setLoadingStats(false);
		}
	}, [debounced]);

	useEffect(() => setPage(1), [debounced, sortBy, sortOrder, perPage]);
	useEffect(() => void fetchList(), [changePlans, fetchList]);
	useEffect(() => void fetchStats(), [fetchStats]);

	useEffect(() => {
		return () => {
			if (abortControllerRef.current) abortControllerRef.current.abort();
		};
	}, []);

	const toggleSort = useCallback(
		field => {
			if (sortBy === field) setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
			else {
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

	const createPlan = async payload => (await api.post('/plans', payload, { headers: { 'Content-Type': 'application/json' } })).data;
	const updatePlan = async (id, payload) => (await api.put(`/plans/${id}`, payload, { headers: { 'Content-Type': 'application/json' } })).data;

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
	const sortLabel =
		sortBy === 'created_at'
			? sortOrder === 'ASC'
				? t('plans.filters.oldestFirst')
				: t('plans.filters.newestFirst')
			: t('plans.filters.sortByDate');

	const [duplicatingIds, setDuplicatingIds] = useState(() => new Set());
	const markDuplicating = useCallback((id, on) => {
		setDuplicatingIds(prev => {
			const next = new Set(prev);
			on ? next.add(id) : next.delete(id);
			return next;
		});
	}, []);

	const handleDuplicate = useCallback(
		async plan => {
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
				const msg = e?.response?.data?.message || t('notifications.duplicateFailed', 'Could not duplicate plan');
				Notification(msg, 'error');
			} finally {
				markDuplicating(plan.id, false);
			}
		},
		[user?.id, user?.adminId, user?.role, t, markDuplicating],
	);


	useEffect(() => {
		const planId = searchParams.get('planId');
		if (!planId) return;

		// ✅ if we just cleared the URL, ignore this one render
		if (skipNextUrlOpenRef.current) {
			skipNextUrlOpenRef.current = false;
			return;
		}

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
		skipNextUrlOpenRef.current = true; // ✅ prevent reopen glitch

		const sp = new URLSearchParams(searchParams.toString());
		sp.delete('planId');

		const qs = sp.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });

		openedFromUrlRef.current = null;
	}, [router, pathname, searchParams]);






	return (
		<div className='space-y-6'>
			<GradientStatsHeader
				onClick={() => setAddOpen(true)}
				btnName={t('plans.header.newPlanButton')}
				title={t('plans.header.title')}
				desc={t('plans.header.desc')}
				loadingStats={loadingStats}
			>
				{user?.role == 'admin' && (
					<>
						<StatCard className=' ' icon={Layers} title={t('plans.stats.globalPlans')} value={stats?.plans?.total || 0} />
						<StatCard className=' ' icon={Layers} title={t('plans.stats.personalPlans')} value={stats?.plans?.totalPlansPersonal || 0} />
					</>
				)}
			</GradientStatsHeader>

			<div className='relative '>
				<div className='flex items-center justify-between gap-2 flex-wrap'>
					<div className='relative flex-1 max-w-[240px] sm:min-w-[260px]'>
						<Search className='absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
						<input
							value={searchText}
							onChange={e => setSearchText(e.target.value)}
							placeholder={t('placeholders.searchPlan')}
							className={[
								'h-11 w-full px-8 rounded-lg',
								'border border-slate-200 bg-white/90 text-slate-900',
								'shadow-sm hover:shadow transition',
								'focus:outline-none focus:ring-4 focus:ring-[color:var(--color-primary-200)]/40 focus:border-[color:var(--color-primary-500)]',
							].join(' ')}
							aria-label={t('placeholders.searchPlan')}
						/>
						{!!searchText && (
							<button
								type='button'
								onClick={() => setSearchText('')}
								className='absolute rtl:left-2 ltr:right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100'
								aria-label={t('actions.clear')}
								title={t('actions.clear')}
							>
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

						<button
							onClick={() => toggleSort('created_at')}
							className={[
								'inline-flex items-center gap-2 rounded-lg px-3 h-11 font-medium transition-all duration-300',
								'border border-slate-200 bg-white/95 text-slate-800 shadow-sm',
								'hover:shadow-md hover:bg-slate-50 active:scale-[.97]',
								'focus:outline-none focus:ring-4 focus:ring-[color:var(--color-primary-200)]/40 focus:border-[color:var(--color-primary-500)]',
							].join(' ')}
						>
							<Clock size={18} />
							<span className='text-sm tracking-wide'>{sortLabel}</span>
						</button>
					</div>
				</div>
			</div>

			{err ? <div className='p-3 rounded-lg bg-red-50 text-red-700 border border-red-100'>{err}</div> : null}

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

			<Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || t('plans.modals.previewTitle')} maxW='max-w-4xl'>
				{preview && <PlanPreview plan={preview} />}
			</Modal>

			<Modal scrollRef={scrollRef} open={addOpen} onClose={() => setAddOpen(false)} title={t('plans.modals.createTitle')} maxW='max-w-5xl'>
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
				onClose={() => {
					clearPlanIdFromUrl(); // ✅ first
					setEditRow(null);
				}}
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

			<Modal open={!!assignOpen} onClose={() => setAssignOpen(null)} title={t('plans.modals.assignTitle', { name: assignOpen?.name || '' })} maxW='max-w-md'>
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
	const user = useUser();

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

	return (
		<div className='divide-y flex flex-col gap-3 divide-slate-100 overflow-hidden '>
			{items.map(p => {
				const dayCount = Array.isArray(p?.program?.days) ? p.program.days.length : 0;
				const active = !!p?.isActive;

				return (
					<div key={p.id} className='rounded-lg border border-y-slate-200 bg-white  group relative flex items-start gap-3 px-4 py-3 transition-all duration-300 hover:bg-slate-50/60'>
						<div className='mt-0.5 grid h-8 w-8 shrink-0 place-content-center rounded-lg theme-gradient-bg opacity-95 text-white shadow-sm'>
							<Dumbbell className='h-5 w-5' />
						</div>

						<div className='min-w-0 flex-1'>
							<div className='flex flex-wrap items-center gap-2'>
								<MultiLangText className='truncate text-base font-semibold text-slate-900'>{p.name}</MultiLangText>
								<span
									className={[
										'inline-flex items-center gap-1 rounded-lg px-2 py-0.5   ring-1 ring-inset',
										active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200',
									].join(' ')}
								>
									{t('plans.list.dayCountLabel', { count: dayCount })}
								</span>
							</div>
						</div>

						<div className='ml-auto flex shrink-0 items-center gap-1'>
							<button
								type='button'
								onClick={() => onAssign?.(p)}
								className='inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-all hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30 active:scale-[.98]'
								title={t('actions.assign')}
							>
								<UsersIcon className='h-4 w-4' />
								{t('actions.assign')}
							</button>

							<div className='flex items-center gap-2'>
								<Link
									href={`/workouts/plans/${p.id}`}
									target='_blank'
									rel='noopener noreferrer'
									className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-white  text-sm font-medium text-emerald-600 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/30'
								>
									<Share2 className='h-4 w-4' />
								</Link>

								<button
									type='button'
									title={t('actions.duplicate', { default: 'Duplicate' })}
									onClick={() => !duplicatingIds?.has(p.id) && onDuplicate?.(p)}
									disabled={duplicatingIds?.has(p.id)}
									aria-busy={duplicatingIds?.has(p.id) ? 'true' : 'false'}
									className={[
										' cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white focus-visible:outline-none focus-visible:ring-4 transition',
										'border-[color:var(--color-secondary-200)] text-[color:var(--color-secondary-700)] hover:bg-[color:var(--color-secondary-50)] focus-visible:ring-[color:var(--color-secondary-200)]/40',
										duplicatingIds?.has(p.id) ? 'opacity-60 pointer-events-none cursor-not-allowed' : '',
									].join(' ')}
								>
									{duplicatingIds?.has(p.id) ? <Loader2 className='h-4 w-4 animate-spin' /> : <Layers className='h-4 w-4' />}
								</button>

								<button
									type='button'
									title={t('actions.preview')}
									onClick={() => onPreview?.(p)}
									className=' cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30'
								>
									<Eye className='h-4 w-4' />
								</button>

								{p?.adminId != null && (
									<button
										type='button'
										title={t('actions.edit')}
										onClick={() => onEdit?.(p)}
										className=' cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[color:var(--color-primary-700)] hover:bg-[color:var(--color-primary-50)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--color-primary-200)]/40'
									>
										<PencilLine className='h-4 w-4' />
									</button>
								)}

								{p?.adminId != null && (
									<button
										type='button'
										title={t('actions.delete')}
										onClick={() => onDelete?.(p.id)}
										className=' cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300/30'
									>
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

const PlanPreview = memo(function PlanPreview({ plan }) {
	const t = useTranslations('workoutPlans');
	const days = plan?.program?.days || [];
	const formatDateTime = value => (value ? new Date(value).toLocaleString() : '—');

	return (
		<div className='space-y-6'>
			<div className='space-y-4'>
				{days.map((d, idx) => {
					const warmup = d.warmupExercises || [];
					const main = d.exercises || [];
					const cardio = d.cardioExercises || [];

					const exercises = [...warmup, ...main, ...cardio];
					const hasExercises = exercises.length > 0;

					return (
						<section key={d.id || idx} className='rounded-lg border border-slate-200 bg-white/90 shadow-sm overflow-hidden'>
							<header className='flex items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3'>
								<div className='flex items-center gap-2'>
									<span className='inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--color-primary-100)] text-xs font-semibold text-[color:var(--color-primary-700)]'>
										{idx + 1}
									</span>
									<MultiLangText className='font-semibold text-slate-900'>{d.name}</MultiLangText>
								</div>

								<div className='flex items-center gap-2 text-[11px]'>
									<span className='inline-flex items-center rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] font-medium text-slate-600'>{t(`days.${d.dayOfWeek}`)}</span>
									<span className='inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700'>
										{exercises.length}{' '}
										<span className='ms-1 font-normal text-emerald-700/80'>{exercises.length === 1 ? t('preview.exercise') : t('preview.exercises')}</span>
									</span>
								</div>
							</header>

							<div className='bg-slate-50/80 px-3 py-3 sm:px-4 sm:py-4'>
								{hasExercises ? (
									<ol className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4'>
										{exercises.map((ex, i) => {
											// detect cardio item (backend returns durationSeconds/note)
											const isCardio = ex?.durationSeconds != null || ex?.note != null;

											return (
												<li
													key={ex.id || ex.exerciseId || i}
													className='group relative flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-xs transition-all hover:-translate-y-[1px] hover:border-[color:var(--color-primary-200)] hover:shadow-md'
												>
													<span className='pointer-events-none absolute top-0 rtl:-right-0 ltr:-left-0 z-10 inline-flex h-6 w-6 items-center justify-center rtl:rounded-[0_10px_0_10px] ltr:rounded-[10px_0_10px_0] bg-[color:var(--color-primary-500)] text-[11px] font-semibold text-white shadow-md'>
														{i + 1}
													</span>

													<div className='shrink-0'>
														<Img showBlur={false} src={ex.img} alt={ex.name} className='h-16 w-16 rounded-lg bg-slate-50 object-contain' />
													</div>

													<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
														<MultiLangText className='truncate text-sm font-semibold text-slate-900 leading-snug'>{ex.name}</MultiLangText>

														{/* ✅ MAIN/WARMUP */}
														{!isCardio && (ex.targetSets || ex.targetReps) && (
															<p className='text-xs text-slate-500'>
																{ex.targetSets ? `${ex.targetSets} ${t('preview.sets')}` : ''}
																{ex.targetSets && ex.targetReps ? ' × ' : ''}
																{ex.targetReps ? `${ex.targetReps} ${t('preview.reps')}` : ''}
															</p>
														)}

														{/* ✅ CARDIO */}
														{isCardio && (
															<div className='text-xs text-slate-500 space-y-0.5'>
																{ex.durationSeconds ? (
																	<div className='inline-flex items-center gap-1'>
																		<Clock className='w-3.5 h-3.5' />
																		<span>{Math.round(Number(ex.durationSeconds) / 60)} min</span>
																	</div>
																) : null}
																{ex.note ? <p className='text-[11px] text-slate-500 line-clamp-2'>{ex.note}</p> : null}
															</div>
														)}
													</div>
												</li>
											);
										})}
									</ol>
								) : (
									<div className='flex items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-white/70 px-3 py-3 text-xs text-slate-500'>
										<span className='flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[13px]'>💡</span>
										<div className='flex flex-col'>
											<span className='font-medium text-slate-700'>{t('preview.noExercisesYetTitle')}</span>
											<span className='text-[11px] text-slate-400'>{t('preview.noExercisesYetHelper')}</span>
										</div>
									</div>
								)}
							</div>
						</section>
					);
				})}

				{!days.length && <div className='rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500'>{t('preview.noDaysYet')}</div>}
			</div>

			<footer className='rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-[11px] text-slate-500'>
				<div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
					<span>
						{t('preview.createdAt')} <span className='font-medium text-slate-700'>{formatDateTime(plan.created_at)}</span>
					</span>
					<span className='hidden text-slate-300 sm:inline'>•</span>
					<span>
						{t('preview.updatedAt')} <span className='font-medium text-slate-700'>{formatDateTime(plan.updated_at)}</span>
					</span>
				</div>
			</footer>
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
				<Select
					placeholder={t('assign.selectUsersPlaceholder')}
					options={optionsClient.filter(o => !selectedUsers.some(u => u.id === o.id))}
					value={null}
					onChange={addUser}
					searchable={true}
				/>
			</div>

			{selectedUsers.length > 0 && (
				<div className='flex flex-wrap gap-2'>
					{selectedUsers.map(user => (
						<span
							key={user.id}
							className='inline-flex items-center gap-2 rounded-lg bg-[color:var(--color-primary-100)] text-[color:var(--color-primary-700)] text-sm px-3 py-1.5 border border-[color:var(--color-primary-200)]'
						>
							{user.label}
							<button type='button' onClick={() => removeUser(user.id)} className='hover:text-slate-900 transition-colors' aria-label={t('assign.removeUser')}>
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

const NewPlanBuilder = memo(function NewPlanBuilder({ scrollRef, initial, onCancel, onCreate }) {
	const t = useTranslations('workoutPlans');
	const [name, setName] = useState(initial?.name || '');
	const [notes, setNotes] = useState(() => {
		const v = initial?.notes;
		return Array.isArray(v) && v.length ? v : [''];
	});
	const [pickerBlock, setPickerBlock] = useState('main'); // 'warmup' | 'main' | 'cardio'

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
			})),

			// ✅ CARDIO: minutes + note (mapped from backend durationSeconds)
			cardioExercises: (x.cardioExercises || []).map((e, j) => ({
				exerciseId: e.exerciseId || e.exercise?.id || e.id,
				name: e.name || e.exercise?.name,
				img: e.img,
				category: e.exercise?.category || e.category || null,
				order: e.order || e.orderIndex || j + 1,
				durationMinutes: toMinutesFromSeconds(e.durationSeconds),
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
				...source,
				id: newId,
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

		setDays(arr =>
			arr.map(day => {
				if (day.id !== pickerDayId) return day;

				const current = day[key] || [];
				const pickedIds = pickedArray.map(x => x.id);

				const keptExisting = current.filter(ex => pickedIds.includes(ex.exerciseId));
				const existingIdsSet = new Set(current.map(ex => ex.exerciseId));

				const newOnes = pickedArray
					.filter(x => !existingIdsSet.has(x.id))
					.map(x => {
						// ✅ cardio defaults: time + note only
						if (pickerBlock === 'cardio') {
							return {
								exerciseId: x.id,
								name: x.name,
								category: x.category || null,
								img: x.img,
								durationMinutes: '',
								note: '',
							};
						}

						// warmup/main defaults
						return {
							exerciseId: x.id,
							name: x.name,
							category: x.category || null,
							img: x.img,
							targetSets: 3,
							targetReps: 12,
							tempo: '1/1/1',
						};
					});

				const merged = [...keptExisting, ...newOnes].map((ex, idx) => ({ ...ex, order: idx + 1 }));
				return { ...day, [key]: merged };
			}),
		);

		setPickerOpen(false);
		setPickerDayId(null);
	};

	const onReorderExercises = (dayId, block, newOrder) => {
		const key = block === 'warmup' ? 'warmupExercises' : block === 'cardio' ? 'cardioExercises' : 'exercises';
		setDays(arr =>
			arr.map(d => {
				if (d.id !== dayId) return d;
				const reordered = newOrder.map((ex, idx) => ({ ...ex, order: idx + 1 }));
				return { ...d, [key]: reordered };
			}),
		);
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
						order: ex.order,
						exerciseId: ex.exerciseId,
						targetSets: ex.targetSets === '' || ex.targetSets == null ? null : Number(ex.targetSets),
						targetReps: ex.targetReps === '' || ex.targetReps == null ? null : Number(ex.targetReps),
						tempo: ex.tempo === '' || ex.tempo == null ? null : String(ex.tempo).trim(),
					})),

					exercises: (d.exercises || []).map(ex => ({
						order: ex.order,
						exerciseId: ex.exerciseId,
						targetSets: ex.targetSets === '' || ex.targetSets == null ? null : Number(ex.targetSets),
						targetReps: ex.targetReps === '' || ex.targetReps == null ? null : Number(ex.targetReps),
						tempo: ex.tempo === '' || ex.tempo == null ? null : String(ex.tempo).trim(),
					})),

					// ✅ CARDIO payload: durationSeconds + note only
					cardioExercises: (d.cardioExercises || []).map(ex => ({
						order: ex.order,
						exerciseId: ex.exerciseId,
						durationSeconds: toSecondsFromMinutes(ex.durationMinutes),
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
		<div className='space-y-4 py-1'>
			<div className='  flex items-center justify-between pb-2 border-b border-slate-100'>
				<Input className='max-w-[400px] w-full' placeholder={t('builder.namePlaceholder')} value={name} onChange={e => setName(e)} />

				<button
					type='button'
					onClick={addDay}
					className='inline-flex items-center gap-2 rounded-lg border border-slate-300  bg-white px-4 py-2 text-sm font-medium text-slate-800  shadow-sm hover:bg-slate-50 active:scale-[.97]  focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30  transition-all duration-200'
				>
					<Plus className='w-4 h-4 text-slate-700' />
					<span>{t('actions.addDay')}</span>
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

			<div className='flex items-center justify-end gap-3 pt-4 border-t border-slate-100'>
				<button
					type='button'
					onClick={onCancel}
					className='inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300  bg-white px-4 py-2.5 text-sm font-medium text-slate-700  shadow-sm hover:bg-slate-50 active:scale-[.97]  focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30  transition-all duration-200'
				>
					{t('actions.cancel')}
				</button>

				<Button name={t('builder.savePlanBtn')} loading={loading} type='button' onClick={submit} className='!w-fit text-sm !h-[39px]'></Button>
			</div>

			<ExercisePicker
				open={pickerOpen}
				dayId={pickerDayId}
				initialSelected={pickerInitialSelected}
				onClose={() => {
					setPickerOpen(false);
					setPickerDayId(null);
				}}
				onDone={onPickerDone}
			/>
		</div>
	);
});

export function DaysListSection({ duplicateDay, days, setDays, openPicker, removeDay, onReorderExercises, DAY_OPTIONS, spring }) {
	const t = useTranslations('workoutPlans');
	const [previewImg, setPreviewImg] = useState(null);

	const btnBase = ' h-[35px] inline-flex items-center justify-center gap-2 rounded-lg text-sm transition ' + 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30 active:scale-[.98]';
	const btnOutline = 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 px-3 py-1.5 shadow-sm';
	const btnGhostDanger = 'border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 px-2.5 py-1.5';
	const iconBtn = 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white ' + 'text-slate-700 hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-slate-400/30';

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

	const normalizeMinutesOrEmpty = (v) => {
		const s = String(v ?? '').trim();
		if (!s) return '';
		const n = Number(s);
		if (!Number.isFinite(n) || n <= 0) return '';
		return String(Math.trunc(n));
	};

	const renderBlock = (day, block, list) => {
		const key = block === 'warmup' ? 'warmupExercises' : block === 'cardio' ? 'cardioExercises' : 'exercises';

		const title =
			block === 'warmup'
				? t('builder.blocks.warmup', { default: 'Warmup' })
				: block === 'cardio'
					? t('builder.blocks.cardio', { default: 'Cardio' })
					: t('builder.blocks.workout', { default: 'Workout' });

		const setExerciseField = (exerciseId, patch) => {
			setDays(arr =>
				arr.map(d0 =>
					d0.id !== day.id
						? d0
						: {
							...d0,
							[key]: (d0[key] || []).map(e => (e.exerciseId !== exerciseId ? e : { ...e, ...patch })),
						},
				),
			);
		};

		const removeExercise = exerciseId => {
			setDays(arr => arr.map(d0 => (d0.id !== day.id ? d0 : { ...d0, [key]: (d0[key] || []).filter(e => e.exerciseId !== exerciseId) })));
		};

		const isCardio = block === 'cardio';

		return (
			<div className='mb-4'>
				<div className='mb-2 text-xs font-semibold text-slate-700'>{title}</div>

				{list?.length ? (
					<Reorder.Group axis='y' values={list} onReorder={newOrder => onReorderExercises(day.id, block, newOrder)} className='space-y-2'>
						{list.map(ex => (
							<Reorder.Item
								key={ex.exerciseId}
								value={ex}
								dragListener
								dragConstraints={{ top: 0, bottom: 0 }}
								className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition-colors hover:bg-slate-100'
							>
								<div className='flex items-center justify-between gap-3'>
									<div className='flex min-w-0 items-center gap-3'>
										<GripVertical className='w-4 h-4 shrink-0 cursor-grab text-slate-400' />

										<div className='relative w-[45px] group'>
											<Img src={ex?.img} showBlur={false} className='w-full rounded' />
											<button
												type='button'
												onClick={() => setPreviewImg(ex.img)}
												className='absolute inset-0 flex items-center justify-center  bg-black/40 opacity-0 group-hover:opacity-100  transition-opacity rounded'
												aria-label={t('actions.preview')}
												title={t('actions.preview')}
											>
												<Eye className='h-4 w-4 text-white' />
											</button>
										</div>

										<MultiLangText className='truncate font-medium text-slate-900'>{ex.name}</MultiLangText>

										{ex.category ? (
											<span className='inline-flex items-center gap-1 rounded-lg border border-[color:var(--color-primary-200)] bg-[color:var(--color-primary-50)] px-2 py-1 text-[11px] text-[color:var(--color-primary-700)]'>
												<Tag size={12} />
												<MultiLangText>{ex.category}</MultiLangText>
											</span>
										) : null}
									</div>

									<div className='flex items-center gap-2'>
										<div className='w-full sm:w-auto'>
											{/* ✅ MAIN/WARMUP fields */}
											{!isCardio && (
												<div className='mt-2 sm:mt-0 sm:ml-auto grid grid-cols-3 gap-1.5 min-w-[210px] max-w-[260px]'>
													<MiniField
														inputMode='numeric'
														type='number'
														placeholder={t('preview.sets')}
														value={ex.targetSets ?? ''}
														onChange={e => setExerciseField(ex.exerciseId, { targetSets: e.target.value })}
														onBlur={() => {
															const s = String(ex.targetSets ?? '').trim();
															if (!s) return;
															setExerciseField(ex.exerciseId, { targetSets: normalizeIntOrDefault(ex.targetSets, 3) });
														}}
													/>

													<MiniField
														inputMode='numeric'
														placeholder={t('preview.reps')}
														value={ex.targetReps ?? ''}
														onChange={e => setExerciseField(ex.exerciseId, { targetReps: e.target.value })}
														onBlur={() => {
															const s = String(ex.targetReps ?? '').trim();
															if (!s) return;
															setExerciseField(ex.exerciseId, { targetReps: normalizeIntOrDefault(ex.targetReps, 12) });
														}}
													/>

													<MiniField
														placeholder={t('preview.tempo', { default: 'Tempo' })}
														value={ex.tempo ?? ''}
														onChange={e => setExerciseField(ex.exerciseId, { tempo: e.target.value })}
														onBlur={() => {
															const s = String(ex.tempo ?? '').trim();
															if (!s) return;
															setExerciseField(ex.exerciseId, { tempo: normalizeTempoOrDefault(ex.tempo, '1/1/1') });
														}}
													/>
												</div>
											)}

											{/* ✅ CARDIO fields (time + note) */}
											{isCardio && (
												<div className=' flex items-center gap-1.5 '>
													<MiniField
														inputMode='numeric'
														className='!h-[35px]  '
														cnParent="!w-[120px]"
														type='number'
														placeholder={t('builder.cardio.minutes', { default: 'Minutes' })}
														value={ex.durationMinutes ?? ''}
														onChange={e => setExerciseField(ex.exerciseId, { durationMinutes: e.target.value })}
														onBlur={() => setExerciseField(ex.exerciseId, { durationMinutes: normalizeMinutesOrEmpty(ex.durationMinutes) })}
														iconLeft={<Clock className='w-3.5 h-4.5 text-slate-400' />}
													/>

													<MiniTextArea
														placeholder={t('builder.cardio.note', { default: 'Cardio note (speed / RPE / intervals...)' })}
														value={ex.note ?? ''}
														onChange={(val) => setExerciseField(ex.exerciseId, { note: val })}
													/>
												</div>
											)}
										</div>

										<button type='button' onClick={() => removeExercise(ex.exerciseId)} className={iconBtn} title={t('actions.delete')} aria-label={t('actions.delete')}>
											<Trash2 className='w-4 h-4' />
										</button>
									</div>
								</div>
							</Reorder.Item>
						))}
					</Reorder.Group>
				) : (
					<div className='rounded-lg border border-dashed border-slate-200 bg-slate-50 py-6 text-center text-sm text-slate-500'>{t('builder.noExercisesHint')}</div>
				)}
			</div>
		);
	};

	return (
		<div className='space-y-4'>
			{days.map(d => (
				<motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='overflow-hidden rounded-lg border border-slate-200 bg-white'>
					<div className='flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3'>
						<div className='flex flex-wrap items-center gap-3'>
							<Select
								clearable={false}
								searchable={false}
								className='!w-[160px]'
								placeholder={t('builder.selectDayPlaceholder')}
								options={DAY_OPTIONS.map(o => ({ id: o.id, label: o.label }))}
								value={d.dayOfWeek}
								onChange={val => setDays(arr => arr.map(x => (x.id === d.id ? { ...x, dayOfWeek: val } : x)))}
							/>
						</div>

						<div className='flex items-center gap-2'>
							<button type='button' onClick={() => openPicker(d.id, 'warmup')} className={`${btnBase} ${btnOutline}`}>
								{t('builder.addWarmup', { default: '+ Warmup' })}
							</button>

							<button type='button' onClick={() => openPicker(d.id, 'main')} className={`${btnBase} ${btnOutline}`}>
								{t('builder.addWorkout', { default: '+ Workout' })}
							</button>

							<button type='button' onClick={() => openPicker(d.id, 'cardio')} className={`${btnBase} ${btnOutline}`}>
								{t('builder.addCardio', { default: '+ Cardio' })}
							</button>

							<button type='button' onClick={() => duplicateDay(d.id)} className={`${btnBase} ${btnOutline} !px-3 !py-1.5`} title={t('actions.duplicateDay', { default: 'Duplicate day' })}>
								<CopyPlus className='w-4 h-4' />
								<span className='hidden sm:inline'>{t('actions.duplicateDay', { default: 'Duplicate day' })}</span>
							</button>

							<button type='button' onClick={() => removeDay(d.id)} className={`${btnBase} ${btnGhostDanger}`} title={t('actions.removeDay')} aria-label={t('actions.removeDay')}>
								<Trash2 className='w-4 h-4' />
							</button>
						</div>
					</div>

					<div className='p-4'>
						{renderBlock(d, 'warmup', d.warmupExercises)}
						{renderBlock(d, 'main', d.exercises)}
						{renderBlock(d, 'cardio', d.cardioExercises)}
					</div>
				</motion.div>
			))}

			{previewImg && (
				<div className='fixed inset-0 z-50 flex items-center justify-center rounded-lg bg-black/70 backdrop-blur-xs' onClick={() => setPreviewImg(null)}>
					<div className='max-w-[90vw] max-h-[90vh] p-4'>
						<Img src={previewImg} alt={t('actions.preview')} className='max-h-[90vh] h-full max-w-full rounded-lg bg-white' onClick={e => e.stopPropagation()} />
					</div>
				</div>
			)}
		</div>
	);
}

const MiniField = memo(function MiniField({ cnParent, value, placeholder, inputMode, onChange, onBlur, className = '', type = 'text', iconLeft = null }) {
	const hasValue = String(value ?? '').trim().length > 0;

	return (
		<div className={`relative w-full ${cnParent}`}>
			<label
				className={[
					'absolute left-2 px-1 text-[10px] transition-all bg-white pointer-events-none',
					hasValue ? 'top-[-6px] !bg-[linear-gradient(to_bottom,#f1f5f9_50%,#ffffff_50%)] text-[color:var(--color-primary-600)]' : 'top-1/2 -translate-y-1/2 text-slate-400 opacity-0',
				].join(' ')}
			>
				{placeholder}
			</label>

			{iconLeft ? <span className='absolute left-2 top-1/2 -translate-y-1/2'>{iconLeft}</span> : null}

			<input
				value={value ?? ''}
				inputMode={inputMode}
				type={type}
				placeholder={hasValue ? '' : placeholder}
				onChange={onChange}
				onBlur={onBlur}
				className={[
					'h-8 w-full rounded-lg border px-2 text-[12px]',
					iconLeft ? 'pl-8' : '',
					'bg-white outline-none transition',
					'focus:ring-4 focus:ring-[color:var(--color-primary-200)]/25 focus:border-[color:var(--color-primary-400)]',
					hasValue ? 'border-[color:var(--color-primary-300)] hover:border-[color:var(--color-primary-400)]' : 'border-slate-200 hover:border-slate-300',
					className,
				].join(' ')}
			/>
		</div>
	);
});

const MiniTextArea = memo(function MiniTextArea({ value, placeholder, onChange, className = '' }) {
	const hasValue = String(value ?? '').trim().length > 0;

	return (
		<div className='relative flex items-center w-full'>
			<label
				className={[
					'absolute left-2 px-1 text-[10px] transition-all bg-white pointer-events-none',
					hasValue ? 'top-[-6px] !bg-[linear-gradient(to_bottom,#f1f5f9_50%,#ffffff_50%)] text-[color:var(--color-primary-600)]' : 'top-3 text-slate-400 opacity-0',
				].join(' ')}
			>
				{placeholder}
			</label>

			<textarea
				rows={1}
				value={value ?? ''}
				placeholder={hasValue ? '' : placeholder}
				onChange={(e) => onChange?.(e.target.value)}
				className={[
					'w-full rounded-lg border px-2 py-2 text-[12px] resize-none',
					'bg-white outline-none transition',
					'focus:ring-4 focus:ring-[color:var(--color-primary-200)]/25 focus:border-[color:var(--color-primary-400)]',
					hasValue ? 'border-[color:var(--color-primary-300)] hover:border-[color:var(--color-primary-400)]' : 'border-slate-200 hover:border-slate-300',
					className,
				].join(' ')}
			/>
		</div>
	);
});
