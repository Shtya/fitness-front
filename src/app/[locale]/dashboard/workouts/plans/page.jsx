'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	AlertCircle, ArrowDownWideNarrow, ArrowUpNarrowWide, CalendarDays, ClipboardList, Copy, Dumbbell, Eye, Globe2,
	PencilLine, Plus, RefreshCw, Share2, Trash2, UserPlus, UserRound, Users, XCircle, Zap,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import api from '@/utils/axios';
import { Modal } from '@/components/dashboard/ui/UI';
import Button from '@/components/atoms/Button';
import Badge from '@/components/atoms/GmBadge';
import GmRowActions from '@/components/atoms/GmRowActions';
import GmStatCard from '@/components/molecules/GmStatCard';
import DataTable from '@/components/atoms/Datatable';
import MultiLangText from '@/components/atoms/MultiLangText';
import { Notification } from '@/config/Notification';
import useDebounced from '@/hooks/useDebounced';
import { useUser } from '@/hooks/useUser';
import { IntakeHero, IntakeToolbar } from '@/components/pages/dashboard/intake/IntakeChrome';
import { PlanBuilder, buildPayloadFromPlan } from '@/components/pages/dashboard/plans/PlanBuilder';
import { AssignForm, PlanPreview, PlanUsers } from '@/components/pages/dashboard/plans/PlanDialogs';

const GM_MODAL = 'gm-modal';
const PER_PAGE_OPTIONS = [6, 12, 24, 48];
const ACTION_NOT_ALLOWED = 'You can only take actions on plans you created.';

const parseList = data => {
	if (Array.isArray(data?.records)) return { records: data.records, total: Number(data.total_records ?? data.records.length) || 0 };
	if (Array.isArray(data?.items)) return { records: data.items, total: Number(data.total ?? data.items.length) || 0 };
	if (Array.isArray(data)) return { records: data, total: data.length };
	return { records: [], total: 0 };
};

const formatDate = (value, locale) => {
	if (!value) return '—';
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', numberingSystem: 'latn' }).format(d);
};

const serverMessage = e => {
	const msg = e?.response?.data?.message;
	return Array.isArray(msg) ? msg.join(', ') : msg;
};

export default function PlansPage() {
	const t = useTranslations('workoutPlans');
	const locale = useLocale();
	const user = useUser();
	const role = String(user?.role || '').toLowerCase();
	const userId = user?.id;
	const adminId = user?.adminId;

	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const scrollRef = useRef(null);

	const [items, setItems] = useState([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [err, setErr] = useState(null);
	const [stats, setStats] = useState(null);

	const [page, setPage] = useState(1);
	const [perPage, setPerPage] = useState(6);
	const [sortOrder, setSortOrder] = useState('DESC');
	const [search, setSearch] = useState('');
	const debounced = useDebounced(search, 350);

	const [preview, setPreview] = useState(null);
	const [createOpen, setCreateOpen] = useState(false);
	const [editRow, setEditRow] = useState(null);
	const [assignPlan, setAssignPlan] = useState(null);
	const [usersPlan, setUsersPlan] = useState(null);
	const [usersList, setUsersList] = useState([]);
	const [usersLoading, setUsersLoading] = useState(false);
	const [usersErr, setUsersErr] = useState(null);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [busy, setBusy] = useState({});

	const reqId = useRef(0);
	const abortRef = useRef(null);
	const usersReq = useRef(0);
	const itemsRef = useRef(items);
	const openedFromUrlRef = useRef(null);

	useEffect(() => { itemsRef.current = items; }, [items]);

	useEffect(() => {
		document.documentElement.dataset.gmUsers = '1';
		return () => { delete document.documentElement.dataset.gmUsers; };
	}, []);

	const markBusy = useCallback((id, kind) => setBusy(prev => {
		const next = { ...prev };
		if (kind) next[id] = kind;
		else delete next[id];
		return next;
	}), []);

	/* ── Fetching ── */
	const fetchList = useCallback(async () => {
		if (!role) return;
		abortRef.current?.abort();
		const ctrl = new AbortController();
		abortRef.current = ctrl;
		const myId = ++reqId.current;
		setLoading(true);
		setErr(null);
		try {
			const params = { page, limit: perPage, sortBy: 'created_at', sortOrder };
			const q = debounced.trim();
			if (q) params.search = q;
			if (role !== 'admin' && role !== 'super_admin' && adminId) params.user_id = adminId;
			const res = await api.get('/plans', { params, signal: ctrl.signal });
			if (myId !== reqId.current) return;
			const { records, total: count } = parseList(res.data);
			setItems(records);
			setTotal(count);
		} catch (e) {
			if (e?.name === 'CanceledError' || myId !== reqId.current) return;
			setItems([]);
			setTotal(0);
			setErr(e?.response ? serverMessage(e) || t('errors.loadPlans') : t('errors.serverUnreachable'));
		} finally {
			if (myId === reqId.current) setLoading(false);
		}
	}, [role, adminId, page, perPage, sortOrder, debounced, t]);

	const fetchStats = useCallback(async () => {
		if (!role) return;
		try {
			const q = debounced.trim();
			const res = await api.get('/plans/overview', { params: q ? { search: q } : {} });
			setStats(res.data || null);
		} catch {
			setStats(null);
		}
	}, [role, debounced]);

	useEffect(() => { fetchList(); }, [fetchList]);
	useEffect(() => { fetchStats(); }, [fetchStats]);
	useEffect(() => () => abortRef.current?.abort(), []);

	const retryAll = useCallback(() => { fetchList(); fetchStats(); }, [fetchList, fetchStats]);
	const getOne = useCallback(async id => (await api.get(`/plans/${id}`)).data, []);

	/* ── URL deep-link (?planId=) ── */
	useEffect(() => {
		const planId = searchParams.get('planId');
		if (!planId) { openedFromUrlRef.current = null; return; }
		if (openedFromUrlRef.current === planId) return;
		openedFromUrlRef.current = planId;
		getOne(planId)
			.then(setEditRow)
			.catch(() => {
				const local = itemsRef.current.find(p => p.id === planId);
				if (local) setEditRow(local);
				else Notification(t('errors.loadPlan'), 'error');
			});
	}, [searchParams, getOne, t]);

	const closeEdit = useCallback(() => {
		if (searchParams.get('planId')) {
			const sp = new URLSearchParams(searchParams.toString());
			sp.delete('planId');
			const qs = sp.toString();
			router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		}
		setEditRow(null);
	}, [searchParams, router, pathname]);

	/* ── Filters ── */
	const onSearch = useCallback(v => { setSearch(v); setPage(1); }, []);
	const toggleSort = useCallback(() => { setSortOrder(o => (o === 'DESC' ? 'ASC' : 'DESC')); setPage(1); }, []);
	const onPageChange = useCallback(({ page: nextPage, per_page }) => {
		const nextLimit = Number(per_page || perPage);
		if (nextLimit !== perPage) {
			setPerPage(nextLimit);
			setPage(1);
		} else {
			setPage(Number(nextPage || 1));
		}
	}, [perPage]);

	const reloadFirstPage = useCallback(() => {
		if (page !== 1) setPage(1);
		else fetchList();
		fetchStats();
	}, [page, fetchList, fetchStats]);

	const notifySaveError = useCallback((e, fallbackKey) => {
		const msg = serverMessage(e);
		if (msg === ACTION_NOT_ALLOWED) return Notification(t('planActionNotAllowed'), 'error');
		if (/^Duplicate day/i.test(msg || '')) return Notification(t('notifications.duplicateDay'), 'error');
		return Notification(msg || t(`notifications.${fallbackKey}`), 'error');
	}, [t]);

	/* ── Users (assignees) ── */
	const loadUsers = useCallback(async plan => {
		if (!plan?.id) return;
		const myId = ++usersReq.current;
		setUsersLoading(true);
		setUsersErr(null);
		try {
			const res = await api.get(`/plans/${plan.id}/assignees`);
			if (myId === usersReq.current) setUsersList(Array.isArray(res.data) ? res.data : []);
		} catch (e) {
			if (myId !== usersReq.current) return;
			setUsersList([]);
			setUsersErr(e?.response ? serverMessage(e) || t('plans.usersModal.loadFailed') : t('errors.serverUnreachable'));
		} finally {
			if (myId === usersReq.current) setUsersLoading(false);
		}
	}, [t]);

	const openUsers = useCallback(plan => { setUsersPlan(plan); setUsersList([]); loadUsers(plan); }, [loadUsers]);
	const closeUsers = useCallback(() => { usersReq.current++; setUsersPlan(null); setUsersList([]); setUsersErr(null); }, []);

	/* ── Actions ── */
	const openPreview = useCallback(plan => {
		setPreview(plan);
		getOne(plan.id).then(full => setPreview(cur => (cur?.id === plan.id ? { ...plan, ...full } : cur))).catch(() => {});
	}, [getOne]);

	const openEdit = useCallback(async plan => {
		markBusy(plan.id, 'edit');
		try {
			setEditRow(await getOne(plan.id));
		} catch {
			setEditRow(plan);
		} finally {
			markBusy(plan.id, null);
		}
	}, [getOne, markBusy]);

	const handleCreate = useCallback(async payload => {
		try {
			await api.post('/plans', payload, { headers: { 'Content-Type': 'application/json' } });
			Notification(t('notifications.planCreated'), 'success');
			setCreateOpen(false);
			reloadFirstPage();
		} catch (e) {
			notifySaveError(e, 'createFailed');
		}
	}, [t, reloadFirstPage, notifySaveError]);

	const handleUpdate = useCallback(async payload => {
		if (!editRow?.id) return;
		try {
			await api.put(`/plans/${editRow.id}`, payload, { headers: { 'Content-Type': 'application/json' } });
			Notification(t('notifications.planUpdated'), 'success');
			closeEdit();
			fetchList();
		} catch (e) {
			notifySaveError(e, 'updateFailed');
		}
	}, [editRow?.id, t, closeEdit, fetchList, notifySaveError]);

	const handleDuplicate = useCallback(async plan => {
		markBusy(plan.id, 'duplicate');
		try {
			const full = await getOne(plan.id).catch(() => plan);
			const payload = buildPayloadFromPlan(full, {
				userId: role === 'admin' ? userId : adminId,
				nameSuffix: ` ${t('copySuffix')}`,
				isActive: full?.isActive ?? true,
			});
			const created = (await api.post('/plans', payload, { headers: { 'Content-Type': 'application/json' } })).data;
			Notification(t('notifications.planDuplicated'), 'success');
			reloadFirstPage();
			if (created?.id) setEditRow(await getOne(created.id).catch(() => created));
		} catch (e) {
			Notification(serverMessage(e) || t('notifications.duplicateFailed'), 'error');
		} finally {
			markBusy(plan.id, null);
		}
	}, [getOne, markBusy, role, userId, adminId, t, reloadFirstPage]);

	const sharePlan = useCallback(plan => {
		window.open(`/workouts/plans/${plan.id}`, '_blank', 'noopener,noreferrer');
	}, []);

	const onAssigned = useCallback(() => {
		const plan = assignPlan;
		setAssignPlan(null);
		fetchList();
		if (plan && usersPlan?.id === plan.id) loadUsers(plan);
	}, [assignPlan, usersPlan?.id, fetchList, loadUsers]);

	const closeDelete = useCallback(() => { if (!deleteLoading) setDeleteTarget(null); }, [deleteLoading]);

	const handleDelete = useCallback(async () => {
		if (!deleteTarget) return;
		setDeleteLoading(true);
		try {
			await api.delete(`/plans/${deleteTarget.id}`);
			Notification(t('notifications.planDeleted'), 'success');
			if (preview?.id === deleteTarget.id) setPreview(null);
			setDeleteTarget(null);
			if (items.length === 1 && page > 1) setPage(p => p - 1);
			else fetchList();
			fetchStats();
		} catch (e) {
			const msg = serverMessage(e);
			Notification(msg === ACTION_NOT_ALLOWED ? t('planActionNotAllowed') : msg || t('notifications.planDeleteFailed'), 'error');
		} finally {
			setDeleteLoading(false);
		}
	}, [deleteTarget, preview?.id, items.length, page, fetchList, fetchStats, t]);

	/* ── Stats ── */
	const statCards = useMemo(() => {
		const pageClients = items.reduce((sum, p) => sum + Number(p?.clientsUsingCount || 0), 0);
		const activeOnPage = items.filter(p => p?.isActive).length;
		const third = role === 'admin'
			? {
				key: 'personal', title: t('plans.stats.personalPlans'), value: Number(stats?.plans?.totalPlansPersonal || 0), icon: UserRound,
				hint: t('plans.stats.personalHint'), tone: 'gm-chip-ok', stroke: 'var(--gm-ok)', fill: 'var(--gm-ok)', seed: 1.4,
			}
			: {
				key: 'active', title: t('plans.stats.activeOnPage'), value: activeOnPage, icon: Zap,
				hint: t('plans.stats.onThisPage'), tone: 'gm-chip-ok', stroke: 'var(--gm-ok)', fill: 'var(--gm-ok)', seed: 1.4,
			};
		return [
			{
				key: 'total', title: t('plans.stats.totalPlans'), value: total, icon: ClipboardList,
				hint: t('plans.stats.totalHint'), tone: 'gm-chip', stroke: 'var(--color-primary-500)', fill: 'var(--color-primary-400)', seed: 0.4, max: total,
			},
			{
				key: 'global', title: t('plans.stats.globalPlans'), value: Number(stats?.plans?.total || 0), icon: Globe2,
				hint: t('plans.stats.globalHint'), tone: 'gm-chip-secondary', stroke: 'var(--color-secondary-500)', fill: 'var(--color-secondary-400)', seed: 0.9,
			},
			third,
			{
				key: 'clients', title: t('plans.stats.clientsOnPage'), value: pageClients, icon: Users,
				hint: t('plans.stats.onThisPage'), tone: 'gm-chip-warn', stroke: 'var(--gm-warn)', fill: 'var(--gm-warn)', seed: 1.9,
			},
		];
	}, [items, total, stats, role, t]);

	/* ── Columns ── */
	const columns = useMemo(() => [
		{
			key: 'name',
			header: t('plans.table.name'),
			headClassName: 'min-w-[240px]',
			className: 'gm-wrap',
			cell: row => {
				const note = (Array.isArray(row.notes) ? row.notes : []).find(Boolean);
				return (
					<button type='button' onClick={() => openPreview(row)} className='flex w-full min-w-0 items-center gap-3 text-start'>
						<span className='gm-plan__icon size-10! shrink-0 rounded-[12px]!'><Dumbbell className='size-4.5' /></span>
						<span className='min-w-0'>
							<MultiLangText className='block truncate text-[13px] font-bold gm-ink'>{row.name}</MultiLangText>
							<span dir='auto' className='mt-0.5 block truncate text-start text-[11.5px] gm-muted'>{note || t('plans.list.noDescription')}</span>
						</span>
					</button>
				);
			},
		},
		{
			key: 'days',
			header: t('plans.table.days'),
			cell: row => {
				const count = Array.isArray(row?.program?.days) ? row.program.days.length : 0;
				return <Badge color='primary' icon={<CalendarDays className='size-3' />}>{t('plans.list.dayCountLabel', { count })}</Badge>;
			},
		},
		{
			key: 'clients',
			header: t('plans.table.clientsUsing'),
			cell: row => (
				<button
					type='button'
					onClick={() => openUsers(row)}
					title={t('plans.usersModal.title')}
					className='inline-flex h-7 items-center gap-1.5 rounded-full border border-(--gm-line) px-2.5 font-en text-[12px] font-semibold tabular-nums gm-ink-soft transition-colors hover:border-(--color-primary-300) hover:text-(--color-primary-700)'
				>
					<Users className='size-3.5' />
					{Number(row.clientsUsingCount ?? 0)}
				</button>
			),
		},
		{
			key: 'scope',
			header: t('plans.table.scope'),
			cell: row => (row.adminId == null
				? <Badge color='violet' icon={<Globe2 className='size-3' />}>{t('plans.table.global')}</Badge>
				: <Badge color='blue' icon={<UserRound className='size-3' />}>{t('plans.table.personal')}</Badge>),
		},
		{
			key: 'status',
			header: t('plans.table.status'),
			cell: row => <Badge color={row.isActive ? 'green' : 'slate'} dot>{row.isActive ? t('plans.table.active') : t('plans.table.inactive')}</Badge>,
		},
		{
			key: 'createdAt',
			header: t('plans.table.createdAt'),
			cell: row => <span className='whitespace-nowrap font-en text-[12.5px] tabular-nums gm-muted'>{formatDate(row.created_at, locale)}</span>,
		},
		{
			key: 'actions',
			header: t('plans.table.actions'),
			headClassName: 'gm-col-end',
			className: 'gm-col-end',
			cell: row => {
				const canManage = row.adminId != null || role === 'super_admin';
				return (
					<GmRowActions
						options={[
							{ icon: Eye, tone: 'primary', label: t('actions.preview'), onClick: () => openPreview(row) },
							{ icon: UserPlus, tone: 'cyan', label: t('actions.assign'), onClick: () => setAssignPlan(row) },
							{ icon: Share2, tone: 'slate', label: t('actions.share'), onClick: () => sharePlan(row) },
							{ icon: Copy, tone: 'violet', label: t('actions.duplicate'), loading: busy[row.id] === 'duplicate', onClick: () => handleDuplicate(row) },
							{ icon: PencilLine, tone: 'amber', label: t('actions.edit'), hide: !canManage, loading: busy[row.id] === 'edit', onClick: () => openEdit(row) },
							{ icon: Trash2, tone: 'danger', label: t('actions.delete'), hide: !canManage, onClick: () => setDeleteTarget(row) },
						]}
					/>
				);
			},
		},
	], [t, locale, role, busy, openPreview, openUsers, sharePlan, handleDuplicate, openEdit]);

	const queryTrim = search.trim();
	const SortIcon = sortOrder === 'DESC' ? ArrowDownWideNarrow : ArrowUpNarrowWide;
	const chips = [
		queryTrim && { key: 'q', label: t('roster.searchLabel'), value: `“${queryTrim}”`, onRemove: () => onSearch('') },
	].filter(Boolean);

	return (
		<div className='gm-surface rs-scope app-stack pb-4'>
			<div className='rs-summary'>
				<IntakeHero
					icon={ClipboardList}
					title={t('plans.header.title')}
					subtitle={t('plans.header.desc')}
					ctaLabel={(
						<>
							<Plus className='size-4' strokeWidth={2} aria-hidden />
							<span>{t('plans.header.newPlanButton')}</span>
						</>
					)}
					onCta={() => setCreateOpen(true)}
				/>
				<section className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
					{statCards.map((card, index) => (
						<GmStatCard key={card.key} card={card} index={index} />
					))}
				</section>
			</div>

			{err && (
				<div role='alert' className='flex flex-wrap items-center gap-2 rounded-[14px] border border-rose-200/70 bg-rose-50/80 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300'>
					<XCircle className='size-4 shrink-0' />
					<span className='min-w-0 flex-1'>{err}</span>
					<button
						type='button'
						onClick={retryAll}
						disabled={loading}
						className='gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5 disabled:opacity-60'
					>
						<RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
						{t('actions.retry')}
					</button>
				</div>
			)}

			<DataTable
				className='gm-table'
				hideToolbar
				compact
				toolbar={(
					<IntakeToolbar
						search={search}
						onSearch={onSearch}
						searching={search.trim() !== debounced}
						searchPlaceholder={t('placeholders.searchPlan')}
						searchLabel={t('roster.searchLabel')}
						clearSearchLabel={t('roster.clearAll')}
						actions={(
							<button
								type='button'
								onClick={toggleSort}
								className={`rs-btn${sortOrder === 'ASC' ? ' is-on' : ''}`}
								aria-pressed={sortOrder === 'ASC'}
								aria-label={t('plans.filters.sortByDate')}
							>
								<SortIcon className='size-4' strokeWidth={2} aria-hidden />
								<span>{sortOrder === 'DESC' ? t('plans.filters.newestFirst') : t('plans.filters.oldestFirst')}</span>
							</button>
						)}
						result={t.rich('roster.resultCount', {
							count: total,
							strong: (chunks) => <strong>{chunks}</strong>,
						})}
						chips={chips}
						onClearAll={() => onSearch('')}
						clearAllLabel={t('roster.clearAll')}
						activeFiltersLabel={t('roster.activeFilters')}
					/>
				)}
				columns={columns}
				data={items}
				isLoading={loading}
				rowKey={row => row.id}
				labels={{
					emptyTitle: err ? t('errors.loadPlans') : t('plans.list.noPlansTitle'),
					emptySubtitle: err ? t('plans.list.retryHint') : queryTrim ? t('roster.emptyHint') : t('plans.list.noPlansDesc'),
				}}
				pagination={{ current_page: page, per_page: perPage, total_records: total }}
				onPageChange={onPageChange}
				perPageOptions={PER_PAGE_OPTIONS}
				hoverable
			/>

			<Modal
				cn='gm-modal-root'
				panelClassName={GM_MODAL}
				open={!!preview}
				onClose={() => setPreview(null)}
				title={preview?.name || t('plans.modals.previewTitle')}
				maxW='max-w-4xl'
			>
				{preview && <PlanPreview plan={preview} locale={locale} />}
			</Modal>

			<Modal
				cn='gm-modal-root'
				panelClassName={GM_MODAL}
				scrollRef={scrollRef}
				open={createOpen}
				onClose={() => setCreateOpen(false)}
				title={t('plans.modals.createTitle')}
				maxW='max-w-5xl'
			>
				{createOpen && <PlanBuilder scrollRef={scrollRef} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />}
			</Modal>

			<Modal
				cn='gm-modal-root'
				panelClassName={GM_MODAL}
				scrollRef={scrollRef}
				open={!!editRow}
				onClose={closeEdit}
				title={`${t('plans.modals.editTitle')} ${editRow?.name || ''}`}
				maxW='max-w-5xl'
			>
				{editRow && <PlanBuilder key={editRow.id} scrollRef={scrollRef} initial={editRow} onSubmit={handleUpdate} onCancel={closeEdit} />}
			</Modal>

			<Modal
				cn='gm-modal-root'
				panelClassName={GM_MODAL}
				open={!!assignPlan}
				onClose={() => setAssignPlan(null)}
				title={t('plans.modals.assignTitle', { name: assignPlan?.name || '' })}
				maxW='max-w-lg'
			>
				{assignPlan && <AssignForm plan={assignPlan} user={user} onAssigned={onAssigned} onCancel={() => setAssignPlan(null)} />}
			</Modal>

			<Modal
				cn='gm-modal-root'
				panelClassName={GM_MODAL}
				open={!!usersPlan}
				onClose={closeUsers}
				title={t('plans.usersModal.title')}
				maxW='max-w-xl'
			>
				{usersPlan && (
					<PlanUsers
						plan={usersPlan}
						users={usersList}
						loading={usersLoading}
						error={usersErr}
						onRetry={() => loadUsers(usersPlan)}
						onAssign={() => setAssignPlan(usersPlan)}
					/>
				)}
			</Modal>

			<Modal cn='gm-modal-root' panelClassName={GM_MODAL} open={!!deleteTarget} onClose={closeDelete} title={t('confirm.deletePlanTitle')} maxW='max-w-md'>
				<div
					className='flex items-start gap-3 rounded-[14px] border p-4'
					style={{
						borderColor: 'color-mix(in srgb, var(--gm-danger) 25%, transparent)',
						background: 'color-mix(in srgb, var(--gm-danger) 8%, var(--gm-paper))',
					}}
				>
					<span
						className='grid size-9 shrink-0 place-items-center rounded-[11px]'
						style={{ color: 'var(--gm-danger)', background: 'color-mix(in srgb, var(--gm-danger) 14%, var(--gm-paper))' }}
					>
						<AlertCircle className='size-[18px]' />
					</span>
					<div className='min-w-0 flex-1'>
						<MultiLangText className='block truncate text-[13.5px] font-bold gm-ink'>{deleteTarget?.name || ''}</MultiLangText>
						<p className='mt-1 text-[13px] leading-relaxed gm-ink-soft'>{t('confirm.deletePlanMsg')}</p>
					</div>
				</div>
				<div className='gm-modal-foot'>
					<Button color='neutral' name={t('actions.cancel')} onClick={closeDelete} disabled={deleteLoading} />
					<Button
						color='red'
						name={t('actions.delete')}
						onClick={handleDelete}
						loading={deleteLoading}
						disabled={deleteLoading}
						icon={<Trash2 className='size-4' />}
					/>
				</div>
			</Modal>
		</div>
	);
}
