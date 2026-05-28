'use client';

import { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import {
	Dumbbell, PencilLine, Eye, Trash2, Layers,
	Settings, RefreshCcw, Clock, X, Tag, Search, Play,
	Image as ImageIcon, PlayCircle, TagIcon, ChevronUp, ChevronDown, Copy
} from 'lucide-react';

import api, { baseImg } from '@/utils/axios';
import { Modal, StatCard, TabsPill } from '@/components/dashboard/ui/UI';
import Img from '@/components/atoms/Img';
import Button from '@/components/atoms/Button';
import Select from '@/components/atoms/Select';
import { Notification } from '@/config/Notification';
import { ExerciseForm } from '@/components/pages/dashboard/workouts/ExerciseForm';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import { PrettyPagination } from '@/components/dashboard/ui/Pagination';
import { useLocale, useTranslations } from 'next-intl';
import MultiLangText from '@/components/atoms/MultiLangText';
import { useUser } from '@/hooks/useUser';
import { useTheme } from '@/app/[locale]/theme';
import ActionButtons from '@/components/atoms/Actions';

const spring = { type: 'spring', stiffness: 360, damping: 30, mass: 0.7 };

export const categoryMap = {
	Arms: 'الذراعين', Back: 'الظهر', Calves: 'عضلات الساق', Cardio: 'تمارين القلب',
	Chest: 'الصدر', Core: 'الوسط / البطن', Forearms: 'الساعدين', 'Full Body': 'جسم كامل',
	General: 'عام', 'Glutes & Hamstrings': 'المؤخرة وأوتار الركبة', Legs: 'الساقين',
	Other: 'أخرى', 'Quads & Hamstrings': 'عضلات الفخذ الأمامية والخلفية', Shoulders: 'الكتفين',
	Abs: 'عضلات البطن', Biceps: 'عضلات البايسبس', Triceps: 'عضلات الترايسبس',
	Neck: 'الرقبة', Hips: 'الوركين', Thighs: 'الفخذين', 'Lower Body': 'الجزء السفلي',
	'Upper Body': 'الجزء العلوي', 'Lower Back': 'أسفل الظهر', 'Upper Back': 'أعلى الظهر',
	Mobility: 'مرونة الحركة', Stretching: 'تمارين الإطالة', Strength: 'القوة',
	Power: 'القوة الانفجارية', HIIT: 'تدريب عالي الكثافة', Pilates: 'البيلاتس',
	Yoga: 'اليوغا', Meditation: 'التأمل', Warmup: 'الإحماء', Cooldown: 'التهدئة',
	Balance: 'التوازن', Functional: 'اللياقة الوظيفية', Plyometrics: 'البليومتريكس',
	Stability: 'الاستقرار', Endurance: 'التحمل', Aerobic: 'تمارين هوائية',
	Anaerobic: 'تمارين لا هوائية', Flexibility: 'المرونة', Strengthening: 'تقوية العضلات',
	Treadmill: 'جهاز المشي', Elliptical: 'جهاز الإليبتكال', Rowing: 'جهاز التجديف',
	Cycling: 'الدراجة الثابتة', 'Stair Climber': 'جهاز صعود الدرج',
	Running: 'الجري', Walking: 'المشي', Swimming: 'السباحة', Boxing: 'الملاكمة',
	MartialArts: 'الفنون القتالية',
};

/* -------------------------------- Helpers -------------------------------- */
const useDebounced = (value, delay = 350) => {
	const [deb, setDeb] = useState(value);
	useEffect(() => {
		const t = setTimeout(() => setDeb(value), delay);
		return () => clearTimeout(t);
	}, [value, delay]);
	return deb;
};

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

/* ---------------------------- Memoized Components --------------------------- */

/** Muscle chip — subtle, pill-shaped tag */
const Chip = memo(({ children }) => (
	<span className='inline-flex items-center rounded-full px-2.5 py-0.5 mr-1 mb-1 text-[11px] font-medium tracking-wide bg-[var(--color-secondary-100)] text-[var(--color-secondary-700)]'>
		{children}
	</span>
));

/** Compact icon button used inside cards */
const IconBtn = memo(({ title, onClick, danger, children }) => (
	<button
		type='button'
		title={title}
		onClick={onClick}
		aria-label={title}
		className={[
			'size-7 grid place-content-center rounded-lg border transition-all duration-150 active:scale-90',
			danger
				? 'border-red-200 bg-white text-rose-600 hover:bg-rose-50'
				: 'border-[var(--color-primary-200)] bg-white text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)]',
		].join(' ')}>
		{children}
	</button>
));

/** Small stat badge */
const StatPill = memo(({ label, value }) => (
	<span className='inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-2.5 py-0.5 text-xs text-[var(--color-primary-700)]'>
		<span className='font-semibold text-[var(--color-primary-800)]'>{label}</span>
		<span className='opacity-70'>{value}</span>
	</span>
));

/* ------------------------------ Main Component ----------------------------- */
export default function ExercisesPage() {
	const t = useTranslations('workouts');
	const user = useUser();
	const { colors } = useTheme();

	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [err, setErr] = useState(null);

	const [stats, setStats] = useState(null);
	const [loadingStats, setLoadingStats] = useState(true);

	const [categories, setCategories] = useState([]);
	const [activeCat, setActiveCat] = useState('all');

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

	const [deleteId, setDeleteId] = useState(null);
	const [deleteOpen, setDeleteOpen] = useState(false);

	const reqId = useRef(0);
	const abortControllerRef = useRef(null);

	const fetchCategories = useCallback(async () => {
		try {
			const res = await api.get('/plan-exercises/categories');
			const cats = Array.isArray(res.data) ? res.data.filter(Boolean) : [];
			setCategories(cats);
		} catch { setCategories([]); }
	}, []);

	const fetchList = useCallback(async () => {
		if (abortControllerRef.current) abortControllerRef.current.abort();
		abortControllerRef.current = new AbortController();
		setErr(null);
		setLoading(true);
		const myId = ++reqId.current;
		try {
			const params = { page, limit: perPage, sortBy, sortOrder };
			if (debounced) params.search = debounced;
			if (activeCat && activeCat !== 'all') params.category = activeCat;

			const res = await api.get(user.role == 'admin' ? '/plan-exercises' : `/plan-exercises?user_id=${user.adminId}`, {
				params, signal: abortControllerRef.current.signal,
			});
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
			setPerPage(serverPerPage);
			setItems(records);
		} catch (e) {
			if (e.name === 'CanceledError') return;
			if (myId !== reqId.current) return;
			setErr(e?.response?.data?.message || t('errors.loadExercises'));
		} finally {
			if (myId === reqId.current) setLoading(false);
		}
	}, [page, debounced, sortBy, sortOrder, perPage, activeCat, t, user.adminId, user.role]);

	const fetchStats = useCallback(async () => {
		setLoadingStats(true);
		try {
			const params = {};
			if (debounced) params.search = debounced;
			if (activeCat && activeCat !== 'all') params.category = activeCat;
			const res = await api.get('/plan-exercises/stats', { params });
			setStats(res.data);
		} catch { } finally { setLoadingStats(false); }
	}, [debounced, activeCat]);

	useEffect(() => { setPage(1); }, [debounced, sortBy, sortOrder, perPage, activeCat]);
	useEffect(() => { fetchCategories(); }, [fetchCategories]);
	useEffect(() => { fetchList(); }, [fetchList]);
	useEffect(() => { fetchStats(); }, [fetchStats]);
	useEffect(() => () => { if (abortControllerRef.current) abortControllerRef.current.abort(); }, []);

	const toggleSort = useCallback(field => {
		if (sortBy === field) setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
		else { setSortBy(field); setSortOrder('ASC'); }
	}, [sortBy]);

	/* ----------------------------- CRUD Handlers ---------------------------- */
	const askDelete = useCallback(id => { setDeleteId(id); setDeleteOpen(true); }, []);
	const locale = useLocale();
	const [deleteLoading, setDeleteLoading] = useState(false);

	const handleDelete = useCallback(async () => {
		if (!deleteId) return;
		setDeleteLoading(true);
		try {
			await api.delete(`/plan-exercises/${deleteId}?lang=${locale}`);
			setItems(arr => arr.filter(x => x.id !== deleteId));
			setTotal(tot => Math.max(0, tot - 1));
			Notification(t('toasts.deleted'), 'success');
		} catch (e) {
			Notification(e?.response?.data?.message || t('errors.deleteFailed'), 'error');
		} finally { setDeleteId(null); setDeleteLoading(false); }
	}, [deleteId, t, locale]);

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

	const totalPages = useMemo(() => Math.max(1, Math.ceil(total / Math.max(1, perPage))), [total, perPage]);

	const tabs = useMemo(() => {
		const base = [{ key: 'all', label: t('filters.all') }];
		return base.concat((categories || []).map(c => ({
			key: c, label: locale === 'ar' ? categoryMap[c] || c : c,
		})));
	}, [categories, t, locale]);

	const handleAddSubmit = useCallback(async payload => {
		try {
			const saved = await createOrUpdate({ payload });
			setItems(arr => [saved, ...arr]);
			setTotal(tot => tot + 1);
			setAddOpen(false);
			setDuplicateInitial(null);
			Notification(t('toasts.created'), 'success');
			if (saved?.category && !categories.includes(saved.category))
				setCategories(prev => [...prev, saved.category].sort());
		} catch (e) {
			Notification(e?.response?.data?.message || t('errors.createFailed'), 'error');
		}
	}, [createOrUpdate, categories, t]);

	const handleEditSubmit = useCallback(async payload => {
		try {
			const saved = await createOrUpdate({ id: editRow.id, payload });
			setItems(arr => arr.map(e => (e.id === editRow.id ? saved : e)));
			setEditRow(null);
			Notification(t('toasts.updated'), 'success');
			if (saved?.category && !categories.includes(saved.category))
				setCategories(prev => [...prev, saved.category].sort());
		} catch (e) {
			Notification(e?.response?.data?.message || t('errors.updateFailed'), 'error');
		}
	}, [createOrUpdate, editRow, categories, t]);

	const handleDuplicate = useCallback(exercise => {
		if (!exercise) return;
		const { id, ...rest } = exercise;
		setDuplicateInitial(rest);
		setAddOpen(true);
	}, []);

	return (
		<div className='space-y-7'>

			{/* ── Header / Stats ── */}
			<GradientStatsHeader
				onClick={() => { setDuplicateInitial(null); setAddOpen(true); }}
				btnName={t('actions.addExercise')}
				title={t('descriptions.exercises')}
				desc={t('descriptions.manageLibrary')}
				loadingStats={loadingStats}
			// stats={stats}
			>
				<>
					<StatCard icon={Layers} title={t('stats.totalGlobalExercise')} value={stats?.totals?.totalGlobalExercise - stats?.totals?.totalPersonalExercise ?? 0} />
					{stats?.totals?.totalPersonalExercise != null && stats?.totals?.totalPersonalExercise != '0' && (
						<StatCard icon={Layers} title={t('stats.totalPersonalExercise')} value={stats?.totals?.totalPersonalExercise ?? 0} />
					)}
					<StatCard icon={Settings} title={t('stats.withVideo')} value={stats?.totals?.withVideo || 0} />
					<StatCard icon={RefreshCcw} title={t('stats.withImage')} value={stats?.totals?.withImage || 0} />
				</>
			</GradientStatsHeader>

			{/* ── Toolbar: Search + Controls ── */}
			<div className='flex items-center justify-between gap-3 flex-wrap'>

				{/* Search */}
				<div className='relative flex-1 max-w-xs'>
					<Search
						className='pointer-events-none absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-primary-400)]'
					/>
					<input
						value={searchText}
						onChange={e => setSearchText(e.target.value)}
						placeholder={t('placeholders.search')}
						aria-label={t('placeholders.search')}
						className={[
							'h-10 w-full rounded-lg border bg-white text-sm outline-none transition-all duration-200',
							'ltr:pl-9 ltr:pr-8 rtl:pr-9 rtl:pl-8',
							'border-[var(--color-primary-200)] text-[var(--color-primary-900)] placeholder:text-[var(--color-primary-400)]',
							'focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-[var(--color-primary-200)]',
							'shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
						].join(' ')}
					/>
					{!!searchText && (
						<button
							type='button'
							onClick={() => setSearchText('')}
							aria-label={t('actions.clear')}
							className='absolute ltr:right-2 rtl:left-2 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-lg text-[var(--color-primary-400)] hover:text-[var(--color-primary-700)] transition-colors'>
							<X className='w-3.5 h-3.5' />
						</button>
					)}
				</div>

				{/* Right controls */}
				<div className='flex items-center gap-2'>
					{/* Per-page select */}
					<div className='w-[80px]'>
						<Select
							searchable={false}
							clearable={false}
							className='!w-full'
							placeholder={t('placeholders.perPage')}
							options={[
								{ id: 8, label: 8 }, { id: 12, label: 12 },
								{ id: 20, label: 20 }, { id: 30, label: 30 },
							]}
							value={perPage}
							onChange={n => setPerPage(Number(n))}
						/>
					</div>

					{/* Sort button */}
					<button
						onClick={() => toggleSort('created_at')}
						className={[
							'inline-flex items-center gap-1.5 rounded-lg border px-3 h-10 text-sm font-medium',
							'border-[var(--color-primary-200)] bg-white text-[var(--color-primary-800)]',
							'shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-[var(--color-primary-50)]',
							'transition-all duration-200 active:scale-[.97]',
						].join(' ')}>
						<Clock size={15} className='text-[var(--color-primary-500)]' />
						<span className='text-xs tracking-wide'>
							{sortBy === 'created_at'
								? (sortOrder === 'ASC' ? t('actions.oldestFirst') : t('actions.newestFirst'))
								: t('actions.sortByDate')}
						</span>
						{sortBy === 'created_at'
							? sortOrder === 'ASC'
								? <ChevronUp size={13} className='text-[var(--color-primary-400)]' />
								: <ChevronDown size={13} className='text-[var(--color-primary-400)]' />
							: null}
					</button>
				</div>
			</div>

			{/* ── Category Tabs ── */}
			{tabs?.length > 1 && (
				<TabsPill
					id='exercise-cats'
					className='!bg-white'
					tabs={tabs}
					active={activeCat}
					onChange={key => setActiveCat(key)}
				/>
			)}

			{/* ── Error banner ── */}
			{err && (
				<div className='flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
					<X className='mt-0.5 h-4 w-4 shrink-0' />
					{err}
				</div>
			)}

			{/* ── Grid ── */}
			<GridView
				t={t}
				loading={loading}
				items={items}
				onView={setPreview}
				onEdit={setEditRow}
				onDelete={askDelete}
				onDuplicate={handleDuplicate}
			/>

			<PrettyPagination page={page} totalPages={totalPages} onPageChange={setPage} />

			{/* ── Preview Modal ── */}
			<Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || t('titles.preview')} maxW='max-w-3xl'>
				{preview && <ExercisePreview t={t} exercise={preview} />}
			</Modal>

			{/* ── Add / Duplicate Modal ── */}
			<Modal open={addOpen} onClose={() => { setAddOpen(false); setDuplicateInitial(null); }} title={t('titles.addExercise')}>
				<ExerciseForm categories={categories} initial={duplicateInitial || null} onSubmit={handleAddSubmit} />
			</Modal>

			{/* ── Edit Modal ── */}
			<Modal open={!!editRow} onClose={() => setEditRow(null)} title={t('titles.editExercise', { name: editRow?.name || '' })}>
				{editRow && <ExerciseForm categories={categories} initial={editRow} onSubmit={handleEditSubmit} />}
			</Modal>

			{/* ── Delete Confirm ── */}
			<ConfirmDialog
				t={t}
				loading={deleteLoading}
				open={deleteOpen}
				onClose={() => { setDeleteOpen(false); setDeleteId(null); }}
				title={t('confirm.deleteTitle')}
				message={t('confirm.deleteMsg')}
				confirmText={t('confirm.deleteBtn')}
				onConfirm={handleDelete}
			/>
		</div>
	);
}

/* ─────────────────────────────── Confirm Dialog ──────────────────────────── */
const ConfirmDialog = memo(({ open, onClose, loading, title, message, onConfirm, confirmText, t }) => (
	<Modal open={open} onClose={onClose} title={title} maxW='max-w-md'>
		<div className='space-y-5'>
			{message && (
				<p className='text-sm md: leading-relaxed text-[var(--color-primary-600)]'>{message}</p>
			)}
			<div className='flex items-center justify-end gap-2'>
				<Button
					name={confirmText}
					loading={loading}
					color='danger'
					className='!w-fit'
					onClick={() => { onConfirm?.(); onClose?.(); }}
				/>
			</div>
		</div>
	</Modal>
));

/* ──────────────────────────────── Grid / Cards ───────────────────────────── */
const SkeletonCard = () => (
	<div className='overflow-hidden rounded-lg border border-[var(--color-primary-100)] bg-white shadow-sm'>
		<div className='aspect-[16/8] w-full animate-pulse bg-[var(--color-primary-100)]' />
		<div className='p-4 space-y-3'>
			<div className='h-4 w-3/4 rounded-lg animate-pulse bg-[var(--color-primary-100)]' />
			<div className='h-3 w-1/2 rounded-lg animate-pulse bg-[var(--color-primary-100)]' />
			<div className='flex gap-2'>
				<div className='h-5 w-14 rounded-full animate-pulse bg-[var(--color-primary-100)]' />
				<div className='h-5 w-14 rounded-full animate-pulse bg-[var(--color-primary-100)]' />
			</div>
		</div>
	</div>
);

const GridView = memo(({ loading, items, onView, onEdit, onDelete, onDuplicate, t }) => {
	if (loading) {
		return (
			<div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
				{Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
			</div>
		);
	}

	if (!items?.length) {
		return (
			<div className='flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-[var(--color-primary-200)] bg-white py-20 text-center shadow-sm'>
				<div className='grid h-16 w-16 place-content-center rounded-lg bg-[var(--color-primary-50)]'>
					<Dumbbell className='h-8 w-8 text-[var(--color-primary-400)]' />
				</div>
				<div>
					<h3 className='text-base font-semibold text-[var(--color-primary-800)]'>{t('empty.title')}</h3>
					<p className='mt-1 text-sm text-[var(--color-primary-400)]'>{t('empty.subtitle')}</p>
				</div>
			</div>
		);
	}

	return (
		<div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
			{items.map(e => <ExerciseCard key={e.id} exercise={e} t={t} onView={onView} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} />)}
		</div>
	);
});

/** Individual card — extracted for clarity and memoization */
const ExerciseCard = memo(({ exercise: e, t, onView, onEdit, onDelete, onDuplicate }) => {
	const hasImg = Boolean(e.img);
	const sets = e.targetSets ?? 3;
	const rest = e.rest ?? 90;

	return (
		<motion.div
			initial={{ opacity: 0, y: 14, scale: 0.97 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={spring}
			className='group relative overflow-hidden rounded-lg border border-[var(--color-primary-100)] bg-white shadow-sm hover:shadow-md hover:border-[var(--color-primary-300)] transition-all duration-300'>

			{/* ── Thumbnail ── */}
			<div className='relative aspect-[16/8] bg-[var(--color-primary-50)]'>
				{hasImg ? (
					<Img
						showBlur={false}
						src={e.img}
						alt={e.name}
						className='h-full w-full object-contain'
						loading='lazy'
					/>
				) : (
					<div className='flex h-full w-full items-center justify-center text-[var(--color-primary-300)]'>
						<Play className='w-10 h-10 opacity-40' />
					</div>
				)}

				{/* Media badge */}
				{(hasImg || e.video) && (
					<span className='absolute bottom-2 ltr:left-2 rtl:right-2 inline-flex items-center gap-1 rounded-lg bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm'>
						{hasImg ? <ImageIcon size={10} /> : <PlayCircle size={10} />}
						{hasImg ? t('media.image') : t('media.video')}
					</span>
				)}

				{/* Action panel — revealed on hover */}
				<div className='absolute  h-fit top-[10px] inset-y-0 ltr:right-0 rtl:left-0 flex items-center px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
					<div className='rounded-full border border-[var(--color-primary-100)] bg-white/95 p-1 shadow-lg backdrop-blur-sm'>
						<ActionButtons
							row={e}
							gap="gap-1"
							actions={[
								{
									icon: <Eye />,
									tooltip: t('actions.view'),
									variant: 'blue',
									size: 'sm',
									onClick: row => onView?.(row),
								},
								{
									icon: <PencilLine />,
									tooltip: t('actions.edit'),
									variant: 'amber',
									size: 'sm',
									hidden: e?.adminId == null,
									onClick: row => onEdit?.(row),
								},
								{
									icon: <Copy />,
									tooltip: t('actions.duplicate', { default: 'Duplicate' }),
									variant: 'purple',
									size: 'sm',
									onClick: row => onDuplicate?.(row),
								},
								{
									icon: <Trash2 />,
									tooltip: t('actions.delete'),
									variant: 'red',
									size: 'sm',
									hidden: e?.adminId == null,
									onClick: row => onDelete?.(row.id),
								},
							]}
						/>
					</div>
				</div>
			</div>

			{/* ── Card body ── */}
			<div className='p-3.5 space-y-2'>

				{/* Name */}
				<p
					className='font-en truncate text-sm font-semibold md: leading-snug text-[var(--color-primary-900)]'
					title={e.name}>
					{e.name}
				</p>

				{/* Category badge */}
				{e.category && (
					<span className='inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] shadow-sm'>
						<Tag size={9} />
						<MultiLangText>{e.category}</MultiLangText>
					</span>
				)}

				{/* Description */}
				{e.details && (
					<MultiLangText
						dir='ltr'
						className='line-clamp-1 text-xs text-[var(--color-primary-500)]'>
						{e.details}
					</MultiLangText>
				)}

				{/* Stats row */}
				<div className='flex flex-wrap gap-1.5 pt-0.5'>
					<span className='inline-flex items-center gap-1 rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-2 py-0.5 text-[10px] text-[var(--color-primary-600)]'>
						{t('meta.sets')}
						<span className='font-bold text-[var(--color-primary-800)]'>{sets}</span>
					</span>
					<span className='inline-flex items-center gap-1 rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-2 py-0.5 text-[10px] text-[var(--color-primary-600)]'>
						{t('meta.rest')}
						<span className='font-bold text-[var(--color-primary-800)]'>{rest}s</span>
					</span>
					{e.tempo && (
						<span className='inline-flex items-center gap-1 rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-2 py-0.5 text-[10px] text-[var(--color-primary-600)]'>
							{t('meta.tempo')}
							<span className='font-bold text-[var(--color-primary-800)]'>{e.tempo}</span>
						</span>
					)}
				</div>
			</div>
		</motion.div>
	);
});

/* ─────────────────────────── Preview Modal Content ──────────────────────── */
const ExercisePreview = memo(({ exercise, baseMedia = '', t }) => {
	const hasImg = !!exercise?.img;
	const hasVideo = !!exercise?.video;
	const [tab, setTab] = useState(hasImg ? 'image' : 'video');

	useEffect(() => { setTab(hasImg ? 'image' : 'video'); }, [exercise?.id, hasImg, hasVideo]);

	const primary = useMemo(() => exercise?.primaryMusclesWorked || [], [exercise]);
	const secondary = useMemo(() => exercise?.secondaryMusclesWorked || [], [exercise]);

	const mediaTabs = [
		{ key: 'image', Icon: ImageIcon, disabled: !hasImg },
		{ key: 'video', Icon: PlayCircle, disabled: !hasVideo },
	];

	return (
		<div className='space-y-5'>

			{/* Media tab switcher */}
			{(hasImg || hasVideo) && (
				<div className='inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary-50)] p-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]'>
					{mediaTabs.map(({ key, Icon, disabled }) => {
						const active = tab === key;
						return (
							<button
								key={key}
								type='button'
								aria-pressed={active}
								disabled={disabled}
								onClick={() => setTab(key)}
								className={[
									'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium outline-none transition-all duration-200',
									active
										? 'bg-white text-[var(--color-primary-800)] shadow'
										: 'text-[var(--color-primary-500)] hover:text-[var(--color-primary-700)]',
									disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
								].join(' ')}>
								<Icon size={14} />
								{t('media.' + key)}
							</button>
						);
					})}
				</div>
			)}

			{/* Media frame */}
			<div className='relative w-full overflow-hidden rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] shadow-sm'>
				<div className='aspect-video flex items-center justify-center'>
					{tab === 'image' && hasImg ? (
						<Img
							src={exercise.img}
							alt={exercise?.name || t('titles.untitled')}
							className='h-full w-full object-contain'
							draggable={false}
							loading='eager'
						/>
					) : tab === 'video' && hasVideo ? (
						<video
							src={exercise?.video?.startsWith('http') ? exercise.video : baseImg + exercise.video}
							controls
							className='h-full max-h-[400px] w-full rounded-lg object-contain'
							preload='metadata'
						/>
					) : (
						<div className='flex flex-col items-center gap-3 py-10 text-center'>
							<div className='grid h-12 w-12 place-items-center rounded-lg bg-[var(--color-primary-100)]'>
								{tab === 'image'
									? <ImageIcon size={20} className='text-[var(--color-primary-400)]' />
									: <PlayCircle size={20} className='text-[var(--color-primary-400)]' />}
							</div>
							<p className='text-sm text-[var(--color-primary-500)]'>
								{t('media.none', { kind: tab === 'image' ? t('media.image') : t('media.video') })}
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Details section */}
			<div className='space-y-3'>
				<div className='flex items-start flex-wrap gap-2'>
					<h3 className='text-lg font-bold text-[var(--color-primary-900)]'>
						{exercise?.name || t('titles.untitled')}
					</h3>
					{exercise?.category && (
						<span className='inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-primary-700)]'>
							<TagIcon size={11} />
							{exercise.category}
						</span>
					)}
				</div>

				{exercise?.details && (
					<p className='max-w-prose text-sm md: leading-6 text-[var(--color-primary-600)]'>
						{exercise.details}
					</p>
				)}

				{/* Stats pills */}
				<div className='flex flex-wrap gap-2'>
					<StatPill label={t('meta.sets')} value={exercise?.targetSets ?? 3} />
					<StatPill label={t('meta.rest')} value={`${exercise?.rest ?? 90}s`} />
					{exercise?.tempo && <StatPill label={t('meta.tempo')} value={exercise.tempo} />}
				</div>

				{/* Muscles */}
				{(primary.length > 0 || secondary.length > 0) && (
					<div className='pt-2'>
						<p className='mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-primary-400)]'>
							{t('labels.muscles')}
						</p>
						<div className='flex flex-wrap'>
							{primary.map(m => <Chip key={`p-${m}`}>{m}</Chip>)}
							{secondary.map(m => <Chip key={`s-${m}`}>{m}</Chip>)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
});