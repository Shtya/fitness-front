'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	AlertCircle, ArrowDownWideNarrow, ArrowUpNarrowWide, CalendarCog, CalendarDays, Copy, Eye, Globe2, PencilLine, Plus,
	RefreshCw, Trash2, UserPlus, UserRound, Users, UtensilsCrossed, XCircle,
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
import { MealPlanForm } from '@/components/pages/dashboard/nutrition/MealPlanForm';
import { AssignMealPlan, MealPlanPreview, MealPlanUsers } from '@/components/pages/dashboard/nutrition/MealPlanDialogs';

const GM_MODAL = 'gm-modal';
const PER_PAGE_OPTIONS = [6, 12, 24, 48];
const URL_KEYS = ['planId', 'plan_id'];

const formatDate = (value, locale) => {
	if (!value) return '—';
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', numberingSystem: 'latn' }).format(d);
};

const serverMessage = e => {
	const msg = e?.response?.data?.message;
	return Array.isArray(msg) ? msg.join(', ') : msg;
};

const firstLine = row => row.desc || String(row.notes || '').split('\n').map(s => s.trim()).find(Boolean) || '';

export default function NutritionManagementPage() {
	const t = useTranslations('nutrition');
	const locale = useLocale();
	const user = useUser();
	const role = String(user?.role || '').toLowerCase();
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
	const openedFromUrlRef = useRef(null);

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
			const res = await api.get('/nutrition/meal-plans', { params, signal: ctrl.signal });
			if (myId !== reqId.current) return;
			setItems(Array.isArray(res.data?.records) ? res.data.records : []);
			setTotal(Number(res.data?.total || 0));
		} catch (e) {
			if (e?.name === 'CanceledError' || myId !== reqId.current) return;
			setItems([]);
			setTotal(0);
			setErr(e?.response ? serverMessage(e) || t('errors.load_plans') : t('errors.server_unreachable'));
		} finally {
			if (myId === reqId.current) setLoading(false);
		}
	}, [role, adminId, page, perPage, sortOrder, debounced, t]);

	const fetchStats = useCallback(async () => {
		if (!role) return;
		try {
			const res = await api.get('/nutrition/stats');
			setStats(res.data?.totals || null);
		} catch {
			setStats(null);
		}
	}, [role]);

	useEffect(() => { fetchList(); }, [fetchList]);
	useEffect(() => { fetchStats(); }, [fetchStats]);
	useEffect(() => () => abortRef.current?.abort(), []);

	const retryAll = useCallback(() => { fetchList(); fetchStats(); }, [fetchList, fetchStats]);
	const getOne = useCallback(async id => (await api.get(`/nutrition/meal-plans/${id}`)).data, []);

	/* ── URL deep-link (?planId=) ── */
	useEffect(() => {
		const planId = URL_KEYS.map(k => searchParams.get(k)).find(Boolean);
		if (!planId) { openedFromUrlRef.current = null; return; }
		if (openedFromUrlRef.current === planId) return;
		openedFromUrlRef.current = planId;
		getOne(planId)
			.then(plan => (plan?.adminId == null ? setPreview(plan) : setEditRow(plan)))
			.catch(e => Notification(serverMessage(e) || t('toast.load_failed'), 'error'));
	}, [searchParams, getOne, t]);

	const clearUrlPlan = useCallback(() => {
		if (!URL_KEYS.some(k => searchParams.get(k))) return;
		const sp = new URLSearchParams(searchParams.toString());
		URL_KEYS.forEach(k => sp.delete(k));
		const qs = sp.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
	}, [searchParams, router, pathname]);

	const closeEdit = useCallback(() => { clearUrlPlan(); setEditRow(null); }, [clearUrlPlan]);
	const closePreview = useCallback(() => { clearUrlPlan(); setPreview(null); }, [clearUrlPlan]);

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

	/* ── Users (assignees) ── */
	const loadUsers = useCallback(async plan => {
		if (!plan?.id) return;
		const myId = ++usersReq.current;
		setUsersLoading(true);
		setUsersErr(null);
		try {
			const res = await api.get(`/nutrition/meal-plans/${plan.id}/assignees`);
			if (myId === usersReq.current) setUsersList(Array.isArray(res.data) ? res.data : []);
		} catch (e) {
			if (myId !== usersReq.current) return;
			setUsersList([]);
			setUsersErr(e?.response ? serverMessage(e) || t('toast.load_failed') : t('errors.server_unreachable'));
		} finally {
			if (myId === usersReq.current) setUsersLoading(false);
		}
	}, [t]);

	const openUsers = useCallback(plan => { setUsersPlan(plan); setUsersList([]); loadUsers(plan); }, [loadUsers]);
	const closeUsers = useCallback(() => { usersReq.current++; setUsersPlan(null); setUsersList([]); setUsersErr(null); }, []);

	/* ── Actions ── */
	const openPreview = useCallback(plan => {
		setPreview(plan);
		getOne(plan.id)
			.then(full => setPreview(cur => (cur?.id === plan.id ? { ...plan, ...full } : cur)))
			.catch(e => {
				Notification(serverMessage(e) || t('toast.load_failed'), 'error');
				setPreview(cur => (cur?.id === plan.id ? null : cur));
			});
	}, [getOne, t]);

	const openEdit = useCallback(async plan => {
		markBusy(plan.id, 'edit');
		try {
			setEditRow(await getOne(plan.id));
		} catch (e) {
			Notification(serverMessage(e) || t('toast.load_failed'), 'error');
		} finally {
			markBusy(plan.id, null);
		}
	}, [getOne, markBusy, t]);

	const openDuplicate = useCallback(async plan => {
		markBusy(plan.id, 'duplicate');
		try {
			const full = await getOne(plan.id);
			setEditRow({ ...full, id: undefined, name: `${full?.name || plan.name} ${t('copy_suffix')}` });
		} catch (e) {
			Notification(serverMessage(e) || t('toast.duplicate_failed'), 'error');
		} finally {
			markBusy(plan.id, null);
		}
	}, [getOne, markBusy, t]);

	const handleCreate = useCallback(async payload => {
		try {
			await api.post('/nutrition/meal-plans', payload);
			Notification(t('toast.created'), 'success');
			setCreateOpen(false);
			reloadFirstPage();
		} catch (e) {
			Notification(serverMessage(e) || t('toast.create_failed'), 'error');
		}
	}, [t, reloadFirstPage]);

	const handleSaveEdit = useCallback(async payload => {
		if (!editRow) return;
		try {
			if (editRow.id) {
				await api.put(`/nutrition/meal-plans/${editRow.id}`, payload);
				Notification(t('toast.updated'), 'success');
				closeEdit();
				fetchList();
			} else {
				await api.post('/nutrition/meal-plans', payload);
				Notification(t('toast.duplicated'), 'success');
				closeEdit();
				reloadFirstPage();
			}
		} catch (e) {
			Notification(serverMessage(e) || t(editRow.id ? 'toast.update_failed' : 'toast.duplicate_failed'), 'error');
		}
	}, [editRow, t, closeEdit, fetchList, reloadFirstPage]);

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
			await api.delete(`/nutrition/meal-plans/${deleteTarget.id}`);
			Notification(t('toast.deleted'), 'success');
			if (preview?.id === deleteTarget.id) setPreview(null);
			setDeleteTarget(null);
			if (items.length === 1 && page > 1) setPage(p => p - 1);
			else fetchList();
			fetchStats();
		} catch (e) {
			Notification(serverMessage(e) || t('toast.delete_failed'), 'error');
		} finally {
			setDeleteLoading(false);
		}
	}, [deleteTarget, preview?.id, items.length, page, fetchList, fetchStats, t]);

	/* ── Stats ── */
	const statCards = useMemo(() => {
		const pageClients = items.reduce((sum, p) => sum + Number(p?.clientsUsingCount || 0), 0);
		return [
			{
				key: 'total', title: t('stats.total_plans'), value: total, icon: UtensilsCrossed,
				hint: t('stats.total_hint'), tone: 'gm-chip', stroke: 'var(--color-primary-500)', fill: 'var(--color-primary-400)', seed: 0.4, max: total,
			},
			{
				key: 'global', title: t('stats.global_plans'), value: Number(stats?.globalPlansCount || 0), icon: Globe2,
				hint: t('stats.global_hint'), tone: 'gm-chip-secondary', stroke: 'var(--color-secondary-500)', fill: 'var(--color-secondary-400)', seed: 0.9,
			},
			{
				key: 'personal', title: t('stats.my_plans'), value: Number(stats?.myPlansCount || 0), icon: UserRound,
				hint: t('stats.my_hint'), tone: 'gm-chip-ok', stroke: 'var(--gm-ok)', fill: 'var(--gm-ok)', seed: 1.4,
			},
			{
				key: 'clients', title: t('stats.clients_on_page'), value: pageClients, icon: Users,
				hint: t('stats.on_this_page'), tone: 'gm-chip-warn', stroke: 'var(--gm-warn)', fill: 'var(--gm-warn)', seed: 1.9,
			},
		];
	}, [items, total, stats, t]);

	/* ── Columns ── */
	const columns = useMemo(() => [
		{
			key: 'name',
			header: t('table.name'),
			headClassName: 'min-w-[240px]',
			className: 'gm-wrap',
			cell: row => (
				<button type='button' onClick={() => openPreview(row)} className='flex w-full min-w-0 items-center gap-3 text-start'>
					<span className='gm-plan__icon size-10! shrink-0 rounded-[12px]!'><UtensilsCrossed className='size-4.5' /></span>
					<span className='min-w-0'>
						<MultiLangText className='block truncate text-[13px] font-bold gm-ink'>{row.name}</MultiLangText>
						<span dir='auto' className='mt-0.5 block truncate text-start text-[11.5px] gm-muted'>{firstLine(row) || t('list.no_desc')}</span>
					</span>
				</button>
			),
		},
		{
			key: 'clients',
			header: t('table.clientsUsing'),
			cell: row => (
				<button
					type='button'
					onClick={() => openUsers(row)}
					title={t('modals.plan_users_title')}
					className='inline-flex h-7 items-center gap-1.5 rounded-full border border-(--gm-line) px-2.5 font-en text-[12px] font-semibold tabular-nums gm-ink-soft transition-colors hover:border-(--color-primary-300) hover:text-(--color-primary-700)'
				>
					<Users className='size-3.5' />
					{Number(row.clientsUsingCount ?? 0)}
				</button>
			),
		},
		{
			key: 'scope',
			header: t('table.scope'),
			cell: row => (row.adminId == null
				? <Badge color='violet' icon={<Globe2 className='size-3' />}>{t('table.global')}</Badge>
				: <Badge color='blue' icon={<UserRound className='size-3' />}>{t('table.personal')}</Badge>),
		},
		{
			key: 'schedule',
			header: t('table.schedule'),
			cell: row => (row.customizeDays
				? <Badge color='amber' icon={<CalendarCog className='size-3' />}>{t('table.custom_days')}</Badge>
				: <Badge color='slate' icon={<CalendarDays className='size-3' />}>{t('table.same_every_day')}</Badge>),
		},
		{
			key: 'createdAt',
			header: t('table.createdAt'),
			cell: row => <span className='whitespace-nowrap font-en text-[12.5px] tabular-nums gm-muted'>{formatDate(row.created_at, locale)}</span>,
		},
		{
			key: 'actions',
			header: t('table.actions'),
			headClassName: 'gm-col-end',
			className: 'gm-col-end',
			cell: row => {
				const canManage = row.adminId != null;
				return (
					<GmRowActions
						options={[
							{ icon: Eye, tone: 'primary', label: t('btn.preview'), onClick: () => openPreview(row) },
							{ icon: UserPlus, tone: 'cyan', label: t('btn.assign'), onClick: () => setAssignPlan(row) },
							{ icon: Users, tone: 'slate', label: t('btn.view_users'), onClick: () => openUsers(row) },
							{ icon: Copy, tone: 'violet', label: t('btn.duplicate'), loading: busy[row.id] === 'duplicate', onClick: () => openDuplicate(row) },
							{ icon: PencilLine, tone: 'amber', label: t('btn.edit'), hide: !canManage, loading: busy[row.id] === 'edit', onClick: () => openEdit(row) },
							{ icon: Trash2, tone: 'danger', label: t('btn.delete'), hide: !canManage, onClick: () => setDeleteTarget(row) },
						]}
					/>
				);
			},
		},
	], [t, locale, busy, openPreview, openUsers, openDuplicate, openEdit]);

	const queryTrim = search.trim();
	const SortIcon = sortOrder === 'DESC' ? ArrowDownWideNarrow : ArrowUpNarrowWide;
	const chips = [
		queryTrim && { key: 'q', label: t('roster.searchLabel'), value: `“${queryTrim}”`, onRemove: () => onSearch('') },
	].filter(Boolean);

	return (
		<div className='gm-surface rs-scope app-stack pb-4'>
			<div className='rs-summary'>
				<IntakeHero
					icon={UtensilsCrossed}
					title={t('ui.title')}
					subtitle={t('ui.subtitle')}
					ctaLabel={(
						<>
							<Plus className='size-4' strokeWidth={2} aria-hidden />
							<span>{t('btn.new_plan')}</span>
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
						{t('btn.retry')}
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
						searchPlaceholder={t('search.placeholder')}
						searchLabel={t('roster.searchLabel')}
						clearSearchLabel={t('roster.clearAll')}
						actions={(
							<button
								type='button'
								onClick={toggleSort}
								className={`rs-btn${sortOrder === 'ASC' ? ' is-on' : ''}`}
								aria-pressed={sortOrder === 'ASC'}
								aria-label={t('search.sort_by_date')}
							>
								<SortIcon className='size-4' strokeWidth={2} aria-hidden />
								<span>{sortOrder === 'DESC' ? t('search.newest_first') : t('search.oldest_first')}</span>
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
					emptyTitle: err ? t('errors.load_plans') : t('list.empty_title'),
					emptySubtitle: err ? t('list.retry_hint') : queryTrim ? t('roster.emptyHint') : t('list.empty_desc'),
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
				onClose={closePreview}
				title={preview?.name || t('modals.details_title')}
				maxW='max-w-4xl'
			>
				{preview && <MealPlanPreview plan={preview} locale={locale} />}
			</Modal>

			<Modal
				cn='gm-modal-root'
				panelClassName={GM_MODAL}
				scrollRef={scrollRef}
				open={createOpen}
				onClose={() => setCreateOpen(false)}
				title={t('modals.create_title')}
				maxW='max-w-5xl'
			>
				{createOpen && <MealPlanForm onSubmitPayload={handleCreate} submitLabel={t('btn.create')} onCancel={() => setCreateOpen(false)} />}
			</Modal>

			<Modal
				cn='gm-modal-root'
				panelClassName={GM_MODAL}
				scrollRef={scrollRef}
				open={!!editRow}
				onClose={closeEdit}
				title={editRow?.id ? `${t('modals.edit_title')}: ${editRow?.name || ''}` : t('modals.duplicate_title')}
				maxW='max-w-5xl'
			>
				{editRow && (
					<MealPlanForm
						key={editRow.id || 'duplicate'}
						initialPlan={editRow}
						onSubmitPayload={handleSaveEdit}
						submitLabel={editRow.id ? t('btn.update') : t('btn.create')}
						onCancel={closeEdit}
					/>
				)}
			</Modal>

			<Modal
				cn='gm-modal-root'
				panelClassName={GM_MODAL}
				open={!!assignPlan}
				onClose={() => setAssignPlan(null)}
				title={t('modals.assign_title_named', { name: assignPlan?.name || '' })}
				maxW='max-w-lg'
			>
				{assignPlan && <AssignMealPlan plan={assignPlan} user={user} onAssigned={onAssigned} onCancel={() => setAssignPlan(null)} />}
			</Modal>

			<Modal
				cn='gm-modal-root'
				panelClassName={GM_MODAL}
				open={!!usersPlan}
				onClose={closeUsers}
				title={t('modals.plan_users_title')}
				maxW='max-w-xl'
			>
				{usersPlan && (
					<MealPlanUsers
						plan={usersPlan}
						users={usersList}
						loading={usersLoading}
						error={usersErr}
						onRetry={() => loadUsers(usersPlan)}
						onAssign={() => setAssignPlan(usersPlan)}
					/>
				)}
			</Modal>

			<Modal cn='gm-modal-root' panelClassName={GM_MODAL} open={!!deleteTarget} onClose={closeDelete} title={t('confirm.delete_title')} maxW='max-w-md'>
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
						<p className='mt-1 text-[13px] leading-relaxed gm-ink-soft'>{t('confirm.delete_msg')}</p>
					</div>
				</div>
				<div className='gm-modal-foot'>
					<Button color='neutral' name={t('btn.cancel')} onClick={closeDelete} disabled={deleteLoading} />
					<Button
						color='red'
						name={deleteLoading ? t('btn.deleting') : t('btn.delete')}
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
