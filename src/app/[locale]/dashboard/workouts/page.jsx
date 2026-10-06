'use client';

import { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import {
	AlertCircle, ArrowDownWideNarrow, ArrowUpNarrowWide, CalendarPlus, CopyPlus, Dumbbell, Eye,
	Gauge, Image as ImageIcon, Layers, PencilLine, Play, PlayCircle, Plus, RefreshCw, Repeat,
	Tag, Timer, Trash2, UserRound, XCircle,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import api from '@/utils/axios';
import { Modal } from '@/components/dashboard/ui/UI';
import Img from '@/components/atoms/Img';
import Button from '@/components/atoms/Button';
import Badge from '@/components/atoms/GmBadge';
import GmRowActions from '@/components/atoms/GmRowActions';
import GmStatCard from '@/components/molecules/GmStatCard';
import { TablePagination } from '@/components/atoms/Datatable';
import { Notification } from '@/config/Notification';
import { ExerciseForm } from '@/components/pages/dashboard/workouts/ExerciseForm';
import { IntakeHero, IntakeToolbar, IntakeFilterPopover, IntakeOptionGroup } from '@/components/pages/dashboard/intake/IntakeChrome';
import { useUser } from '@/hooks/useUser';
import useDebounced from '@/hooks/useDebounced';
import { categoryLabel, exerciseVideoSrc } from '@/lib/exercise-categories';

const GM_MODAL = 'gm-modal';
const PER_PAGE_OPTIONS = [8, 12, 20, 30];

const buildMultipartIfNeeded = payload => {
	const hasFile = payload.imgFile || payload.videoFile;
	if (!hasFile) return null;
	const fd = new FormData();
	Object.entries(payload).forEach(([k, v]) => {
		if (v === undefined || v === null) return;
		if (k === 'imgFile' && v) fd.append('img', v);
		else if (k === 'videoFile' && v) fd.append('video', v);
		else if (Array.isArray(v)) fd.append(k, JSON.stringify(v));
		else fd.append(k, String(v));
	});
	return fd;
};

const toList = v => {
	if (Array.isArray(v)) return v.filter(Boolean);
	if (typeof v !== 'string' || !v.trim()) return [];
	try {
		const parsed = JSON.parse(v);
		if (Array.isArray(parsed)) return parsed.filter(Boolean);
	} catch { }
	return v.split(',').map(s => s.trim()).filter(Boolean);
};

/* ------------------------------ Main Component ----------------------------- */
export default function ExercisesPage() {
	const t = useTranslations('workouts');
	const locale = useLocale();
	const user = useUser();
	const userId = user?.id;
	const userRole = String(user?.role || '').toLowerCase();
	const userAdminId = user?.adminId;
	const userReady = user !== undefined;

	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [err, setErr] = useState(null);

	const [stats, setStats] = useState(null);
	const [categories, setCategories] = useState([]);
	const [activeCat, setActiveCat] = useState('all');
	const [filterOpen, setFilterOpen] = useState(false);
	const filterAnchorRef = useRef(null);

	const [page, setPage] = useState(1);
	const [perPage, setPerPage] = useState(12);
	const [total, setTotal] = useState(0);
	const [sortBy, setSortBy] = useState('created_at');
	const [sortOrder, setSortOrder] = useState('DESC');
	const [searchText, setSearchText] = useState('');
	const debounced = useDebounced(searchText, 350);

	const [preview, setPreview] = useState(null);
	const [editRow, setEditRow] = useState(null);
	const [addOpen, setAddOpen] = useState(false);
	const [duplicateInitial, setDuplicateInitial] = useState(null);

	const [deleteTarget, setDeleteTarget] = useState(null);
	const [deleteLoading, setDeleteLoading] = useState(false);

	const reqId = useRef(0);
	const abortControllerRef = useRef(null);

	useEffect(() => {
		document.documentElement.dataset.gmUsers = '1';
		return () => { delete document.documentElement.dataset.gmUsers; };
	}, []);

	const fetchCategories = useCallback(async () => {
		try {
			const res = await api.get('/plan-exercises/categories');
			setCategories(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
		} catch { setCategories([]); }
	}, []);

	const fetchList = useCallback(async () => {
		if (!userReady) return;
		if (!userId) {
			setLoading(false);
			return;
		}
		abortControllerRef.current?.abort();
		abortControllerRef.current = new AbortController();
		setErr(null);
		setLoading(true);
		const myId = ++reqId.current;
		try {
			const params = { page, limit: perPage, sortBy, sortOrder };
			if (debounced) params.search = debounced;
			if (activeCat && activeCat !== 'all') params.category = activeCat;

			const path = userRole === 'admin' || userRole === 'super_admin'
				? '/plan-exercises'
				: `/plan-exercises?user_id=${userAdminId || userId}`;
			const res = await api.get(path, { params, signal: abortControllerRef.current.signal });
			const data = res.data || {};
			let records = [], totalRecords = 0, serverPerPage = perPage;

			if (Array.isArray(data.records)) {
				records = data.records;
				totalRecords = Number(data.total_records || data.records.length || 0);
				serverPerPage = Number(data.per_page || perPage);
			} else if (Array.isArray(data)) {
				records = data; totalRecords = data.length;
			} else if (Array.isArray(data.items)) {
				records = data.items;
				totalRecords = Number(data.total || data.items.length || 0);
				serverPerPage = Number(data.limit || perPage);
			}

			if (myId !== reqId.current) return;
			setTotal(totalRecords);
			if (Number.isFinite(serverPerPage) && serverPerPage > 0) setPerPage(serverPerPage);
			setItems(records);
		} catch (e) {
			if (e.name === 'CanceledError') return;
			if (myId !== reqId.current) return;
			setErr(e?.response
				? e.response.data?.message || t('errors.loadExercises')
				: t('errors.serverUnreachable'));
		} finally {
			if (myId === reqId.current) setLoading(false);
		}
	}, [page, debounced, sortBy, sortOrder, perPage, activeCat, t, userReady, userId, userRole, userAdminId]);

	const fetchStats = useCallback(async () => {
		try {
			const res = await api.get('/plan-exercises/stats');
			setStats(res.data);
		} catch { }
	}, []);

	useEffect(() => { fetchCategories(); fetchStats(); }, [fetchCategories, fetchStats]);
	const retryAll = useCallback(() => { fetchList(); fetchStats(); fetchCategories(); }, [fetchList, fetchStats, fetchCategories]);
	useEffect(() => { fetchList(); }, [fetchList]);
	useEffect(() => () => abortControllerRef.current?.abort(), []);

	/* ----------------------------- Filters ---------------------------------- */
	const onSearch = useCallback(value => { setSearchText(value); setPage(1); }, []);
	const onCategory = useCallback(key => { setActiveCat(key); setPage(1); }, []);

	const toggleSort = useCallback(() => {
		if (sortBy === 'created_at') setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
		else { setSortBy('created_at'); setSortOrder('ASC'); }
		setPage(1);
	}, [sortBy]);

	const onPageChange = useCallback(({ page: nextPage, per_page }) => {
		const nextLimit = Number(per_page ?? perPage);
		if (nextLimit !== perPage) {
			setPerPage(nextLimit);
			setPage(1);
		} else {
			setPage(Number(nextPage ?? 1));
		}
	}, [perPage]);

	/* ----------------------------- CRUD Handlers ---------------------------- */
	const askDelete = useCallback(exercise => setDeleteTarget(exercise), []);
	const closeDelete = useCallback(() => { if (!deleteLoading) setDeleteTarget(null); }, [deleteLoading]);

	const handleDelete = useCallback(async () => {
		const id = deleteTarget?.id;
		if (!id) return;
		setDeleteLoading(true);
		try {
			await api.delete(`/plan-exercises/${id}?lang=${locale}`);
			setItems(arr => arr.filter(x => x.id !== id));
			setTotal(tot => Math.max(0, tot - 1));
			if (preview?.id === id) setPreview(null);
			Notification(t('toasts.deleted'), 'success');
			fetchStats();
		} catch (e) {
			Notification(e?.response?.data?.message || t('errors.deleteFailed'), 'error');
		} finally {
			setDeleteLoading(false);
			setDeleteTarget(null);
		}
	}, [deleteTarget, locale, preview?.id, t, fetchStats]);

	const createOrUpdate = useCallback(async ({ id, payload }) => {
		const body = {
			name: payload.name, userId: payload.userId,
			details: payload.details || null, category: payload.category || null,
			primaryMusclesWorked: payload.primaryMusclesWorked || [],
			secondaryMusclesWorked: payload.secondaryMusclesWorked || [],
			targetReps: payload.targetReps || '10',
			targetSets: Number(payload.targetSets || 3),
			rest: Number(payload.rest || 90),
			tempo: payload.tempo || null,
			img: payload.imgFile ? undefined : payload.imgUrl || undefined,
			video: payload.videoFile ? undefined : payload.videoUrl || undefined,
			imgFile: payload.imgFile || undefined,
			videoFile: payload.videoFile || undefined,
		};
		const fd = buildMultipartIfNeeded(body);
		const url = id ? `/plan-exercises/${id}` : '/plan-exercises';
		const method = id ? 'put' : 'post';
		const res = await api[method](url, fd || body, fd ? undefined : { headers: { 'Content-Type': 'application/json' } });
		return res.data;
	}, []);

	const rememberCategory = useCallback(category => {
		if (category) setCategories(prev => (prev.includes(category) ? prev : [...prev, category].sort()));
	}, []);

	const closeAdd = useCallback(() => { setAddOpen(false); setDuplicateInitial(null); }, []);
	const closeEdit = useCallback(() => setEditRow(null), []);

	const handleAddSubmit = useCallback(async payload => {
		try {
			const saved = await createOrUpdate({ payload });
			setItems(arr => [saved, ...arr]);
			setTotal(tot => tot + 1);
			closeAdd();
			Notification(t('toasts.created'), 'success');
			rememberCategory(saved?.category);
			fetchStats();
		} catch (e) {
			Notification(e?.response?.data?.message || t('errors.createFailed'), 'error');
		}
	}, [createOrUpdate, closeAdd, rememberCategory, fetchStats, t]);

	const handleEditSubmit = useCallback(async payload => {
		if (!editRow) return;
		try {
			const saved = await createOrUpdate({ id: editRow.id, payload });
			setItems(arr => arr.map(e => (e.id === editRow.id ? saved : e)));
			setEditRow(null);
			Notification(t('toasts.updated'), 'success');
			rememberCategory(saved?.category);
		} catch (e) {
			Notification(e?.response?.data?.message || t('errors.updateFailed'), 'error');
		}
	}, [createOrUpdate, editRow, rememberCategory, t]);

	const handleDuplicate = useCallback(exercise => {
		if (!exercise) return;
		const { id, ...rest } = exercise;
		setDuplicateInitial(rest);
		setAddOpen(true);
	}, []);

	const openAdd = useCallback(() => { setDuplicateInitial(null); setAddOpen(true); }, []);

	const tabs = useMemo(() => [
		{ id: 'all', name: t('roster.allCategories'), icon: Layers },
		...categories.map(c => ({ id: c, name: categoryLabel(c, locale), icon: Tag })),
	], [categories, t, locale]);

	const queryTrim = searchText.trim();
	const activeCatName = tabs.find(tab => tab.id === activeCat)?.name;
	const chips = [
		queryTrim && { key: 'q', label: t('roster.searchLabel'), value: `“${queryTrim}”`, onRemove: () => onSearch('') },
		activeCat !== 'all' && { key: 'cat', label: t('roster.category'), value: activeCatName, onRemove: () => onCategory('all') },
	].filter(Boolean);

	const statCards = useMemo(() => {
		const totals = stats?.totals || {};
		const all = Number(totals.totalGlobalExercise || 0);
		const personal = Number(totals.totalPersonalExercise || 0);
		const hasPersonal = totals.totalPersonalExercise != null && personal > 0;
		const shared = Math.max(0, all - personal);
		const max = Math.max(all, 1);
		return [
			{
				key: 'library',
				title: t('stats.totalGlobalExercise'),
				value: shared,
				icon: Layers,
				hint: t('stats.libraryHint'),
				tone: 'gm-chip',
				stroke: 'var(--color-primary-500)',
				fill: 'var(--color-primary-400)',
				seed: 0.4,
				max,
			},
			hasPersonal
				? {
					key: 'personal',
					title: t('stats.totalPersonalExercise'),
					value: personal,
					icon: UserRound,
					hint: t('stats.personalHint'),
					tone: 'gm-chip-secondary',
					stroke: 'var(--color-secondary-500)',
					fill: 'var(--color-secondary-400)',
					seed: 0.9,
					max,
				}
				: {
					key: 'recent',
					title: t('stats.added7d'),
					value: Number(totals.created7d || 0),
					icon: CalendarPlus,
					hint: t('stats.recentHint'),
					tone: 'gm-chip-secondary',
					stroke: 'var(--color-secondary-500)',
					fill: 'var(--color-secondary-400)',
					seed: 0.9,
					max,
				},
			{
				key: 'video',
				title: t('stats.withVideo'),
				value: Number(totals.withVideo || 0),
				icon: PlayCircle,
				hint: t('stats.ofTotal', { total: all }),
				tone: 'gm-chip-ok',
				stroke: 'var(--gm-ok)',
				fill: 'var(--gm-ok)',
				seed: 1.4,
				max,
			},
			{
				key: 'image',
				title: t('stats.withImage'),
				value: Number(totals.withImage || 0),
				icon: ImageIcon,
				hint: t('stats.ofTotal', { total: all }),
				tone: 'gm-chip-warn',
				stroke: 'var(--gm-warn)',
				fill: 'var(--gm-warn)',
				seed: 1.9,
				max,
			},
		];
	}, [stats, t]);

	const hasFilters = Boolean(searchText) || activeCat !== 'all';
	const clearFilters = useCallback(() => { setSearchText(''); setActiveCat('all'); setPage(1); }, []);
	const SortIcon = sortBy === 'created_at' && sortOrder === 'ASC' ? ArrowUpNarrowWide : ArrowDownWideNarrow;
	const sortLabel = sortBy === 'created_at'
		? (sortOrder === 'ASC' ? t('actions.oldestFirst') : t('actions.newestFirst'))
		: t('actions.sortByDate');

	return (
		<div className='gm-surface rs-scope app-stack pb-4'>
			<div className='rs-summary'>
				<IntakeHero
					icon={Dumbbell}
					title={t('descriptions.exercises')}
					subtitle={t('descriptions.manageLibrary')}
					ctaLabel={(
						<>
							<Plus className='size-4' strokeWidth={2} aria-hidden />
							<span>{t('actions.addExercise')}</span>
						</>
					)}
					onCta={openAdd}
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

			<section className='gm-panel'>
				<div className='space-y-4 p-4 sm:p-5'>
					<IntakeToolbar
						search={searchText}
						onSearch={onSearch}
						searching={searchText.trim() !== debounced}
						searchPlaceholder={t('placeholders.search')}
						searchLabel={t('roster.searchLabel')}
						clearSearchLabel={t('roster.clearAll')}
						filterLabel={t('roster.category')}
						filterCount={activeCat === 'all' ? 0 : 1}
						filterOpen={filterOpen}
						onFilterToggle={() => setFilterOpen(v => !v)}
						filterAnchorRef={filterAnchorRef}
						actions={(
							<button
								type='button'
								onClick={toggleSort}
								className={`rs-btn${sortOrder === 'ASC' ? ' is-on' : ''}`}
								aria-pressed={sortOrder === 'ASC'}
								aria-label={t('actions.sortByDate')}
							>
								<SortIcon className='size-4' strokeWidth={2} aria-hidden />
								<span>{sortLabel}</span>
							</button>
						)}
						result={t.rich('roster.resultCount', {
							count: total,
							strong: (chunks) => <strong>{chunks}</strong>,
						})}
						chips={chips}
						onClearAll={clearFilters}
						clearAllLabel={t('roster.clearAll')}
						activeFiltersLabel={t('roster.activeFilters')}
					>
						<IntakeFilterPopover
							open={filterOpen}
							anchorRef={filterAnchorRef}
							onClose={() => setFilterOpen(false)}
							title={t('roster.category')}
							canReset={activeCat !== 'all'}
							onReset={() => onCategory('all')}
							resetLabel={t('roster.reset')}
							doneLabel={t('roster.done')}
						>
							<div className='max-h-[min(60vh,420px)] overflow-y-auto'>
								<IntakeOptionGroup
									label={t('roster.category')}
									name='exercise-category'
									options={tabs}
									value={activeCat}
									onChange={onCategory}
								/>
							</div>
						</IntakeFilterPopover>
					</IntakeToolbar>

					{(!err || loading) && <GridView
						t={t}
						locale={locale}
						loading={loading}
						items={items}
						skeletonCount={Math.min(perPage, 8)}
						canManageGlobal={userRole === 'super_admin'}
						hasFilters={hasFilters}
						onClearFilters={clearFilters}
						onAdd={openAdd}
						onView={setPreview}
						onEdit={setEditRow}
						onDelete={askDelete}
						onDuplicate={handleDuplicate}
					/>}
				</div>

				{total > 0 && !err && (
					<div className='gm-panel__foot'>
						<TablePagination
							pagination={{ current_page: page, per_page: perPage, total_records: total }}
							onPageChange={onPageChange}
							isLoading={loading}
							perPageOptions={PER_PAGE_OPTIONS}
							persistLimit={false}
						/>
					</div>
				)}
			</section>

			<Modal
				cn='gm-modal-root'
				panelClassName={GM_MODAL}
				open={!!preview}
				onClose={() => setPreview(null)}
				title={preview?.name || t('titles.preview')}
				maxW='max-w-3xl'
			>
				{preview && <ExercisePreview t={t} locale={locale} exercise={preview} />}
			</Modal>

			<Modal cn='gm-modal-root' panelClassName={GM_MODAL} open={addOpen} onClose={closeAdd} title={t('titles.addExercise')}>
				{addOpen && (
					<ExerciseForm categories={categories} initial={duplicateInitial} onSubmit={handleAddSubmit} onCancel={closeAdd} />
				)}
			</Modal>

			<Modal
				cn='gm-modal-root'
				panelClassName={GM_MODAL}
				open={!!editRow}
				onClose={closeEdit}
				title={t('titles.editExercise', { name: editRow?.name || '' })}
			>
				{editRow && <ExerciseForm categories={categories} initial={editRow} onSubmit={handleEditSubmit} onCancel={closeEdit} />}
			</Modal>

			<Modal cn='gm-modal-root' panelClassName={GM_MODAL} open={!!deleteTarget} onClose={closeDelete} title={t('confirm.deleteTitle')} maxW='max-w-md'>
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
						<p dir='auto' className='truncate text-[13.5px] font-bold gm-ink'>{deleteTarget?.name || ''}</p>
						<p className='mt-1 text-[13px] leading-relaxed gm-ink-soft'>{t('confirm.deleteMsg')}</p>
					</div>
				</div>
				<div className='gm-modal-foot'>
					<Button color='neutral' name={t('actions.cancel')} onClick={closeDelete} disabled={deleteLoading} />
					<Button
						color='red'
						name={t('confirm.deleteBtn')}
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

/* ──────────────────────────────── Grid / Cards ───────────────────────────── */
const SkeletonCard = () => (
	<div className='gm-media-card pointer-events-none'>
		<div className='gm-media-card__media'>
			<div className='gm-skel absolute inset-0 rounded-none!' />
		</div>
		<div className='px-3.5 pb-3 pt-3'>
			<div className='gm-skel h-4 w-3/4' />
			<div className='gm-skel mt-2 h-3 w-full' />
			<div className='gm-skel mt-1.5 h-3 w-2/3' />
			<div className='gm-media-card__foot mt-3 flex items-center justify-between pt-2.5'>
				<div className='gm-skel h-3.5 w-24' />
				<div className='gm-skel h-7 w-24 rounded-[10px]!' />
			</div>
		</div>
	</div>
);

const GRID = 'grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4';

const GridView = memo(function GridView({
	loading, items, skeletonCount, onView, onEdit, onDelete, onDuplicate, onAdd, onClearFilters,
	canManageGlobal, hasFilters, t, locale,
}) {
	if (loading) {
		return (
			<div className={GRID} aria-busy='true'>
				{Array.from({ length: skeletonCount }).map((_, i) => <SkeletonCard key={i} />)}
			</div>
		);
	}

	if (!items?.length) {
		return (
			<div className='flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-6 py-16 text-center' style={{ borderColor: 'var(--gm-line)' }}>
				<span className='gm-plan__icon size-14! rounded-[18px]!'>
					<Dumbbell className='size-7' strokeWidth={1.6} />
				</span>
				<div>
					<h3 className='text-[15px] font-bold gm-ink'>{t('empty.title')}</h3>
					<p className='mt-1 max-w-sm text-[13px] gm-muted'>{hasFilters ? t('roster.emptyHint') : t('empty.subtitle')}</p>
				</div>
				<div className='flex flex-wrap justify-center gap-2'>
					{hasFilters && (
						<button type='button' onClick={onClearFilters} className='gm-btn-ghost gm-btn-compact'>
							{t('actions.clear')}
						</button>
					)}
					<button type='button' onClick={onAdd} className='gm-btn-primary gm-btn-compact'>
						<Plus className='size-3.5' />
						{t('actions.addExercise')}
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className={GRID}>
			{items.map((e, i) => (
				<ExerciseCard
					key={e.id}
					index={i}
					exercise={e}
					t={t}
					locale={locale}
					canManageGlobal={canManageGlobal}
					onView={onView}
					onEdit={onEdit}
					onDelete={onDelete}
					onDuplicate={onDuplicate}
				/>
			))}
		</div>
	);
});

const ExerciseCard = memo(function ExerciseCard({ exercise: e, index, t, locale, onView, onEdit, onDelete, onDuplicate, canManageGlobal }) {
	const hasImg = Boolean(e.img);
	const hasVideo = Boolean(e.video);
	const isPersonal = e?.adminId != null;
	const hideOwnerActions = !isPersonal && !canManageGlobal;

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.28, delay: Math.min(index, 8) * 0.03, ease: [0.2, 0.75, 0.25, 1] }}
		>
			<article className='gm-media-card group h-full'>
				<button
					type='button'
					onClick={() => onView(e)}
					aria-label={`${t('actions.view')}: ${e.name}`}
					className='gm-media-card__media block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary-400) focus-visible:ring-inset'
				>
					{hasImg ? (
						<Img
							showBlur={false}
							src={e.img}
							alt={e.name}
							className='h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transform-none'
							loading='lazy'
						/>
					) : (
						<span className='grid h-full w-full place-items-center text-(--color-primary-300)'>
							<Dumbbell className='size-10' strokeWidth={1.4} />
						</span>
					)}

					<span className='gm-media-card__shade' />

					{(hasImg || hasVideo) && (
						<span className='absolute start-2.5 top-2.5 flex gap-1'>
							{hasImg && <span className='gm-media-icon' title={t('media.image')}><ImageIcon className='size-3' /></span>}
							{hasVideo && <span className='gm-media-icon' title={t('media.video')}><PlayCircle className='size-3' /></span>}
						</span>
					)}
					{isPersonal && (
						<span className='absolute end-2.5 top-2.5'>
							<Badge color='violet' dot>{t('badges.personal')}</Badge>
						</span>
					)}
					{hasVideo && (
						<span className='absolute inset-0 grid place-items-center'>
							<span className='gm-media-play'><Play className='size-4 translate-x-px fill-current' /></span>
						</span>
					)}
					{e.category && (
						<span className='absolute bottom-2.5 start-2.5 max-w-[calc(100%-20px)]'>
							<span className='gm-media-badge max-w-full truncate'>
								<Tag className='size-3 shrink-0' />
								<span className='truncate'>{categoryLabel(e.category, locale)}</span>
							</span>
						</span>
					)}
				</button>

				<div className='flex flex-1 flex-col px-3.5 pb-3 pt-3'>
					<p dir='auto' className='truncate text-start text-[14px] font-bold leading-snug gm-ink' title={e.name}>
						{e.name}
					</p>
					<p dir='auto' className={`mt-1 line-clamp-2 min-h-[34px] text-start text-[12px] leading-[17px] ${e.details ? 'gm-muted' : 'gm-faint'}`}>
						{e.details || t('empty.noDetails')}
					</p>

					<div className='gm-media-card__foot mt-3 flex items-center justify-between gap-2 pt-2.5'>
						<div className='flex min-w-0 items-center gap-3 text-[11.5px] font-semibold gm-ink-soft'>
							<span className='inline-flex items-center gap-1' title={`${t('meta.sets')} × ${t('meta.reps')}`}>
								<Repeat className='size-3.5 text-(--color-primary-500)' />
								<span className='font-en tabular-nums' dir='ltr'>{e.targetSets ?? 3}×{e.targetReps ?? 10}</span>
							</span>
							<span className='inline-flex items-center gap-1' title={t('meta.rest')}>
								<Timer className='size-3.5 text-(--color-primary-500)' />
								<span className='font-en tabular-nums' dir='ltr'>{e.rest ?? 90}s</span>
							</span>
						</div>
						<GmRowActions
							size='sm'
							options={[
								{ icon: Eye, tone: 'primary', label: t('actions.view'), onClick: () => onView(e) },
								{ icon: PencilLine, tone: 'amber', label: t('actions.edit'), hide: hideOwnerActions, onClick: () => onEdit(e) },
								{ icon: CopyPlus, tone: 'violet', label: t('actions.duplicate'), onClick: () => onDuplicate(e) },
								{ icon: Trash2, tone: 'danger', label: t('actions.delete'), hide: hideOwnerActions, onClick: () => onDelete(e) },
							]}
						/>
					</div>
				</div>
			</article>
		</motion.div>
	);
});

/* ─────────────────────────── Preview Modal Content ──────────────────────── */
function MetaTile({ icon: Icon, label, value }) {
	return (
		<div className='gm-cred justify-start!'>
			<span className='gm-cred__icon shrink-0'><Icon className='size-4' /></span>
			<div className='min-w-0'>
				<p className='gm-cred__label'>{label}</p>
				<p className='gm-cred__value font-en tabular-nums' dir='ltr'>{value}</p>
			</div>
		</div>
	);
}

const ExercisePreview = memo(function ExercisePreview({ exercise, t, locale }) {
	const hasImg = !!exercise?.img;
	const hasVideo = !!exercise?.video;
	const [tab, setTab] = useState(hasImg ? 'image' : 'video');

	useEffect(() => { setTab(hasImg ? 'image' : 'video'); }, [exercise?.id, hasImg]);

	const primary = useMemo(() => toList(exercise?.primaryMusclesWorked), [exercise?.primaryMusclesWorked]);
	const secondary = useMemo(() => toList(exercise?.secondaryMusclesWorked), [exercise?.secondaryMusclesWorked]);

	const mediaTabs = [
		{ key: 'image', Icon: ImageIcon, disabled: !hasImg },
		{ key: 'video', Icon: PlayCircle, disabled: !hasVideo },
	];

	return (
		<div className='space-y-5'>
			{(hasImg || hasVideo) && (
				<div className='w-fit rounded-[12px] border p-1' style={{ borderColor: 'var(--gm-line)', background: 'color-mix(in srgb, var(--gm-paper) 62%, transparent)' }}>
					<div role='radiogroup' className='gm-seg gm-seg--plain'>
						{mediaTabs.map(({ key, Icon, disabled }) => (
							<button
								key={key}
								type='button'
								role='radio'
								aria-checked={tab === key}
								disabled={disabled}
								onClick={() => setTab(key)}
								className={`gm-seg-item inline-flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40 ${tab === key ? 'is-on' : ''}`}
							>
								<Icon className='size-3.5' />
								{t('media.' + key)}
							</button>
						))}
					</div>
				</div>
			)}

			<div className='overflow-hidden rounded-2xl border' style={{ borderColor: 'var(--gm-line)', background: 'color-mix(in srgb, var(--color-primary-50) 70%, var(--gm-paper))' }}>
				<div className='flex aspect-video items-center justify-center'>
					{tab === 'image' && hasImg ? (
						<Img src={exercise.img} alt={exercise?.name || t('titles.untitled')} className='h-full w-full object-contain' draggable={false} loading='eager' />
					) : tab === 'video' && hasVideo ? (
						<video src={exerciseVideoSrc(exercise.video)} controls className='h-full w-full object-contain' preload='metadata' />
					) : (
						<div className='flex flex-col items-center gap-3 py-10 text-center'>
							<span className='gm-plan__icon'>
								{tab === 'image' ? <ImageIcon className='size-5' /> : <PlayCircle className='size-5' />}
							</span>
							<p className='text-[13px] gm-muted'>
								{t('media.none', { kind: tab === 'image' ? t('media.image') : t('media.video') })}
							</p>
						</div>
					)}
				</div>
			</div>

			<div className='space-y-4'>
				<div className='flex flex-wrap items-center gap-2'>
					<h3 dir='auto' className='text-[17px] font-bold gm-ink'>{exercise?.name || t('titles.untitled')}</h3>
					{exercise?.category && (
						<Badge color='primary' icon={<Tag className='size-3' />}>{categoryLabel(exercise.category, locale)}</Badge>
					)}
				</div>

				{exercise?.details && (
					<p dir='auto' className='max-w-prose whitespace-pre-line text-start text-[13px] leading-6 gm-ink-soft'>{exercise.details}</p>
				)}

				<div className='grid grid-cols-2 gap-2.5 sm:grid-cols-4'>
					<MetaTile icon={Layers} label={t('meta.sets')} value={exercise?.targetSets ?? 3} />
					<MetaTile icon={Repeat} label={t('meta.reps')} value={exercise?.targetReps ?? 10} />
					<MetaTile icon={Timer} label={t('meta.rest')} value={`${exercise?.rest ?? 90}s`} />
					<MetaTile icon={Gauge} label={t('meta.tempo')} value={exercise?.tempo || '—'} />
				</div>

				{(primary.length > 0 || secondary.length > 0) && (
					<div className='space-y-2.5'>
						{primary.length > 0 && (
							<div>
								<p className='mb-1.5 text-[12px] font-semibold gm-muted'>{t('labels.primary')}</p>
								<div className='flex flex-wrap gap-1.5'>
									{primary.map(m => <Badge key={`p-${m}`} color='blue'>{m}</Badge>)}
								</div>
							</div>
						)}
						{secondary.length > 0 && (
							<div>
								<p className='mb-1.5 text-[12px] font-semibold gm-muted'>{t('labels.secondary')}</p>
								<div className='flex flex-wrap gap-1.5'>
									{secondary.map(m => <Badge key={`s-${m}`} color='slate'>{m}</Badge>)}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
});
