'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	AlertCircle, Beef, BookMarked, BookOpen, ChefHat, Droplets, Eye, Flame, Layers, Lightbulb, ListChecks,
	PencilLine, PlayCircle, Plus, RefreshCw, Soup, Trash2, Utensils, Wheat, XCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import api, { baseImg } from '@/utils/axios';
import { Modal } from '@/components/dashboard/ui/UI';
import Img from '@/components/atoms/Img';
import Button from '@/components/atoms/Button';
import Badge from '@/components/atoms/GmBadge';
import GmRowActions from '@/components/atoms/GmRowActions';
import GmStatCard from '@/components/molecules/GmStatCard';
import DataTable from '@/components/atoms/Datatable';
import { Notification } from '@/config/Notification';
import useDebounced from '@/hooks/useDebounced';
import { IntakeHero, IntakeToolbar, IntakeFilterPopover, IntakeOptionGroup } from '@/components/pages/dashboard/intake/IntakeChrome';
import { RecipeForm } from '@/components/pages/dashboard/recipes/RecipeForm';
import { SATIETY_COLOR, mealTypeLabel, mealTypeMeta, satietyLabel } from '@/lib/recipe-meta';

const GM_MODAL = 'gm-modal';
const PER_PAGE_OPTIONS = [6, 12, 24, 48];

/* ─────────────────────────── API mapping ─────────────────────────── */
const normalizeImage = url => {
	if (!url) return '';
	return /^(https?:|data:|blob:)/i.test(url) ? url : `${baseImg}${url.startsWith('/') ? '' : '/'}${url}`;
};

const mapRecipeFromApi = item => ({
	id: item.id,
	title: item.title || '',
	satiety: String(item.satiety_index || 'medium').toLowerCase(),
	category: item.meal_type || '',
	calories: item?.nutrition?.calories ?? 0,
	protein: item?.nutrition?.protein_g ?? 0,
	carbs: item?.nutrition?.carbs_g ?? 0,
	fat: item?.nutrition?.fat_g ?? 0,
	ingredients: item.ingredients || [],
	creamIngredients: item.cream_ingredients || [],
	sauceIngredients: item.sauce_ingredients || [],
	directions: item.directions || [],
	tips: Array.isArray(item.tips) ? item.tips.join('\n') : '',
	videoUrl: item.video_url || '',
	imageUrl: normalizeImage(item.image_url),
});

const splitLines = value => String(value || '').split('\n').map(v => v.trim()).filter(Boolean);

const buildRecipeFormData = form => {
	const fd = new FormData();
	fd.append('title', form.title || '');
	fd.append('satiety_index', form.satiety || 'medium');
	fd.append('meal_type', form.category || '');
	fd.append('video_url', form.videoUrl || '');
	fd.append('nutrition', JSON.stringify({
		calories: Number(form.calories || 0),
		carbs_g: Number(form.carbs || 0),
		protein_g: Number(form.protein || 0),
		fat_g: Number(form.fat || 0),
	}));
	fd.append('ingredients', JSON.stringify(form.ingredients || []));
	fd.append('cream_ingredients', JSON.stringify(form.creamIngredients || []));
	fd.append('sauce_ingredients', JSON.stringify(form.sauceIngredients || []));
	fd.append('directions', JSON.stringify(form.directions || []));
	fd.append('tips', JSON.stringify(splitLines(form.tips)));
	if (form.imageFile) fd.append('image', form.imageFile);
	return fd;
};

const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US');

/* ─────────────────────────── Table cells ─────────────────────────── */
function MealTypeBadge({ type, t }) {
	if (!type) return <span className='gm-faint'>—</span>;
	const { icon: Icon, color } = mealTypeMeta(type);
	return <Badge color={color} icon={<Icon className='size-3' />}>{mealTypeLabel(type, t)}</Badge>;
}

function NutritionCell({ row, t }) {
	return (
		<div className='flex flex-wrap items-center gap-1.5' dir='ltr'>
			<span className='gm-plan__chip font-en tabular-nums text-(--color-primary-700)!' title={t('slidePanel.fields.calories')}>
				<Flame className='size-3' />
				{fmt(row.calories)}
				<span className='font-normal gm-faint'>{t('slidePanel.fields.kcal')}</span>
			</span>
			{[
				{ key: 'protein', Icon: Beef, color: 'var(--color-primary-500)' },
				{ key: 'carbs', Icon: Wheat, color: 'var(--gm-warn)' },
				{ key: 'fat', Icon: Droplets, color: 'var(--color-secondary-500)' },
			].map(({ key, Icon, color }) => (
				<span key={key} className='inline-flex items-center gap-1 font-en text-[11.5px] font-semibold tabular-nums gm-ink-soft' title={t(`slidePanel.fields.${key}`)}>
					<Icon className='size-3' style={{ color }} />
					{fmt(row[key])}g
				</span>
			))}
		</div>
	);
}

/* ─────────────────────────── Preview ─────────────────────────── */
function MetaTile({ icon: Icon, label, value, color }) {
	return (
		<div className='gm-cred justify-start!'>
			<span className='gm-cred__icon shrink-0' style={color ? { color } : undefined}><Icon className='size-4' /></span>
			<div className='min-w-0'>
				<p className='gm-cred__label'>{label}</p>
				<p className='gm-cred__value font-en tabular-nums' dir='ltr'>{value}</p>
			</div>
		</div>
	);
}

function PreviewList({ icon: Icon, title, items, numbered }) {
	if (!items?.length) return null;
	return (
		<div className='gm-answer'>
			<p className='mb-2.5 flex items-center gap-2 text-[12.5px] font-bold gm-ink'>
				<span className='gm-plan__icon size-7! rounded-[9px]!'><Icon className='size-3.5' /></span>
				{title}
				<span className='gm-plan__chip font-en tabular-nums'>{items.length}</span>
			</p>
			<ol className='space-y-2'>
				{items.map((item, i) => (
					<li key={i} className='flex items-start gap-2.5 text-[13px] leading-relaxed gm-ink-soft'>
						{numbered ? (
							<span
								className='mt-0.5 grid size-5 shrink-0 place-items-center rounded-[7px] font-en text-[10.5px] font-bold text-white tabular-nums'
								style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
							>
								{i + 1}
							</span>
						) : (
							<span className='mt-2 size-1.5 shrink-0 rounded-full bg-(--color-primary-400)' />
						)}
						<span dir='auto' className='min-w-0 flex-1 text-start wrap-break-word'>{item}</span>
					</li>
				))}
			</ol>
		</div>
	);
}

function RecipePreview({ recipe, t }) {
	const tips = splitLines(recipe.tips);
	return (
		<div className='space-y-5'>
			<div className='grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,240px)_1fr]'>
				<div className='overflow-hidden rounded-2xl border border-(--gm-line)' style={{ background: 'color-mix(in srgb, var(--color-primary-50) 70%, var(--gm-paper))' }}>
					<div className='aspect-4/3'>
						{recipe.imageUrl ? (
							<Img src={recipe.imageUrl} alt={recipe.title} showBlur={false} className='h-full w-full object-cover' />
						) : (
							<span className='grid h-full place-items-center text-(--color-primary-300)'><ChefHat className='size-10' strokeWidth={1.4} /></span>
						)}
					</div>
				</div>
				<div className='flex min-w-0 flex-col gap-3'>
					<h3 dir='auto' className='text-start text-[18px] font-bold leading-snug gm-ink'>{recipe.title}</h3>
					<div className='flex flex-wrap items-center gap-1.5'>
						<MealTypeBadge type={recipe.category} t={t} />
						<Badge color={SATIETY_COLOR[recipe.satiety] || 'slate'} dot>{satietyLabel(recipe.satiety, t)}</Badge>
					</div>
					<div className='grid grid-cols-2 gap-2.5'>
						<MetaTile icon={Flame} label={t('slidePanel.fields.calories')} value={`${fmt(recipe.calories)} ${t('slidePanel.fields.kcal')}`} />
						<MetaTile icon={Beef} label={t('slidePanel.fields.protein')} value={`${fmt(recipe.protein)}g`} color='var(--color-primary-500)' />
						<MetaTile icon={Wheat} label={t('slidePanel.fields.carbs')} value={`${fmt(recipe.carbs)}g`} color='var(--gm-warn)' />
						<MetaTile icon={Droplets} label={t('slidePanel.fields.fat')} value={`${fmt(recipe.fat)}g`} color='var(--color-secondary-500)' />
					</div>
					{recipe.videoUrl && (
						<a
							href={recipe.videoUrl}
							target='_blank'
							rel='noreferrer'
							className='gm-btn-ghost gm-btn-compact inline-flex w-fit items-center gap-1.5'
						>
							<PlayCircle className='size-4' />
							{t('preview.watchVideo')}
						</a>
					)}
				</div>
			</div>

			<div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
				<PreviewList icon={Utensils} title={t('slidePanel.sections.ingredients')} items={recipe.ingredients} />
				<PreviewList icon={Soup} title={t('slidePanel.sections.creamIngredients')} items={recipe.creamIngredients} />
				<PreviewList icon={Soup} title={t('slidePanel.sections.sauceIngredients')} items={recipe.sauceIngredients} />
				<PreviewList icon={Lightbulb} title={t('slidePanel.sections.tips')} items={tips} />
			</div>
			<PreviewList icon={ListChecks} title={t('slidePanel.sections.directions')} items={recipe.directions} numbered />
		</div>
	);
}

/* ─────────────────────────── Page ─────────────────────────── */
export default function RecipesPage() {
	const t = useTranslations('recipeLibrary');

	const [recipes, setRecipes] = useState([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [err, setErr] = useState(null);
	const [statsData, setStatsData] = useState(null);
	const [mealTypes, setMealTypes] = useState([]);

	const [activeTab, setActiveTab] = useState('all');
	const [filterOpen, setFilterOpen] = useState(false);
	const filterAnchorRef = useRef(null);
	const [search, setSearch] = useState('');
	const debouncedSearch = useDebounced(search, 350);
	const [page, setPage] = useState(1);
	const [perPage, setPerPage] = useState(12);

	const [formOpen, setFormOpen] = useState(false);
	const [editRecipe, setEditRecipe] = useState(null);
	const [saving, setSaving] = useState(false);
	const [preview, setPreview] = useState(null);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [deleteLoading, setDeleteLoading] = useState(false);

	const reqId = useRef(0);
	const abortRef = useRef(null);

	useEffect(() => {
		document.documentElement.dataset.gmUsers = '1';
		return () => { delete document.documentElement.dataset.gmUsers; };
	}, []);

	const filterParams = useMemo(() => {
		const params = {};
		const q = debouncedSearch.trim();
		if (q) params.search = q;
		if (activeTab !== 'all') params.meal_type = activeTab;
		return params;
	}, [debouncedSearch, activeTab]);

	const fetchRecipes = useCallback(async () => {
		abortRef.current?.abort();
		const ctrl = new AbortController();
		abortRef.current = ctrl;
		const myId = ++reqId.current;
		setLoading(true);
		setErr(null);
		try {
			const res = await api.get('/recipes', { params: { ...filterParams, page, limit: perPage }, signal: ctrl.signal });
			if (myId !== reqId.current) return;
			setRecipes((res?.data?.items || []).map(mapRecipeFromApi));
			setTotal(Number(res?.data?.total || 0));
		} catch (e) {
			if (e?.name === 'CanceledError' || myId !== reqId.current) return;
			setRecipes([]);
			setTotal(0);
			setErr(e?.response ? e.response.data?.message || t('errors.load') : t('errors.serverUnreachable'));
		} finally {
			if (myId === reqId.current) setLoading(false);
		}
	}, [filterParams, page, perPage, t]);

	const fetchStats = useCallback(async () => {
		try {
			const res = await api.get('/recipes/stats', { params: filterParams });
			setStatsData(res?.data || null);
		} catch {
			setStatsData(null);
		}
	}, [filterParams]);

	const fetchMeta = useCallback(async () => {
		try {
			const res = await api.get('/recipes/filters/meta');
			setMealTypes(res?.data?.filters?.meal_type || []);
		} catch {
			setMealTypes([]);
		}
	}, []);

	useEffect(() => { fetchMeta(); }, [fetchMeta]);
	useEffect(() => { fetchStats(); }, [fetchStats]);
	useEffect(() => { fetchRecipes(); }, [fetchRecipes]);
	useEffect(() => () => abortRef.current?.abort(), []);

	const retryAll = useCallback(() => { fetchRecipes(); fetchStats(); fetchMeta(); }, [fetchRecipes, fetchStats, fetchMeta]);

	/* ── Filters ── */
	const onSearch = useCallback(v => { setSearch(v); setPage(1); }, []);
	const onTab = useCallback(id => { setActiveTab(id); setPage(1); }, []);
	const clearFilters = useCallback(() => { setSearch(''); setActiveTab('all'); setPage(1); }, []);
	const hasFilters = Boolean(search) || activeTab !== 'all';

	const mealOptions = useMemo(() => [
		{ id: 'all', name: t('roster.allTypes'), icon: Layers },
		...mealTypes.map(type => ({ id: type, name: mealTypeLabel(type, t), icon: mealTypeMeta(type).icon })),
	], [mealTypes, t]);
	const activeMealName = mealOptions.find(opt => opt.id === activeTab)?.name;

	/* ── Mutations ── */
	const openAdd = useCallback(() => { setEditRecipe(null); setFormOpen(true); }, []);
	const openEdit = useCallback(recipe => { setEditRecipe(recipe); setFormOpen(true); }, []);
	const closeForm = useCallback(() => {
		if (saving) return;
		setFormOpen(false);
		setEditRecipe(null);
	}, [saving]);

	const handleSave = useCallback(async form => {
		setSaving(true);
		try {
			const payload = buildRecipeFormData(form);
			if (editRecipe?.id) {
				await api.put(`/recipes/${editRecipe.id}`, payload);
				Notification(t('toasts.updated'), 'success');
				fetchRecipes();
			} else {
				await api.post('/recipes', payload);
				Notification(t('toasts.created'), 'success');
				if (page !== 1) setPage(1);
				else fetchRecipes();
			}
			setFormOpen(false);
			setEditRecipe(null);
			fetchStats();
			fetchMeta();
		} catch (e) {
			Notification(e?.response?.data?.message || t('errors.save'), 'error');
		} finally {
			setSaving(false);
		}
	}, [editRecipe?.id, page, fetchRecipes, fetchStats, fetchMeta, t]);

	const closeDelete = useCallback(() => { if (!deleteLoading) setDeleteTarget(null); }, [deleteLoading]);

	const handleDelete = useCallback(async () => {
		if (!deleteTarget) return;
		setDeleteLoading(true);
		try {
			await api.delete(`/recipes/${deleteTarget.id}`);
			Notification(t('toasts.deleted'), 'success');
			if (preview?.id === deleteTarget.id) setPreview(null);
			setDeleteTarget(null);
			if (recipes.length === 1 && page > 1) setPage(p => p - 1);
			else fetchRecipes();
			fetchStats();
		} catch (e) {
			Notification(e?.response?.data?.message || t('errors.delete'), 'error');
		} finally {
			setDeleteLoading(false);
		}
	}, [deleteTarget, preview?.id, recipes.length, page, fetchRecipes, fetchStats, t]);

	/* ── Stats ── */
	const statCards = useMemo(() => {
		const s = statsData?.summary || {};
		const totalRecipes = Number(s.total_recipes || 0);
		return [
			{
				key: 'total', title: t('stats.totalRecipes'), value: totalRecipes, icon: BookOpen,
				hint: t('stats.totalHint'), tone: 'gm-chip',
				stroke: 'var(--color-primary-500)', fill: 'var(--color-primary-400)', seed: 0.4, max: totalRecipes,
			},
			{
				key: 'calories', title: t('stats.avgCalories'), value: Math.round(Number(s.avg_calories || 0)), icon: Flame,
				hint: t('stats.perRecipeKcal'), tone: 'gm-chip-warn',
				stroke: 'var(--gm-warn)', fill: 'var(--gm-warn)', seed: 0.9,
			},
			{
				key: 'protein', title: t('stats.avgProtein'), value: Math.round(Number(s.avg_protein || 0)), icon: Beef,
				hint: t('stats.perRecipeGrams'), tone: 'gm-chip-ok',
				stroke: 'var(--gm-ok)', fill: 'var(--gm-ok)', seed: 1.4,
			},
			{
				key: 'types', title: t('stats.mealTypes'), value: mealTypes.length, icon: Layers,
				hint: t('stats.mealTypesHint'), tone: 'gm-chip-secondary',
				stroke: 'var(--color-secondary-500)', fill: 'var(--color-secondary-400)', seed: 1.9,
			},
		];
	}, [statsData, mealTypes.length, t]);

	/* ── Columns ── */
	const columns = useMemo(() => [
		{
			key: 'title',
			header: t('table.name'),
			headClassName: 'min-w-[240px]',
			className: 'gm-wrap',
			cell: row => (
				<button type='button' onClick={() => setPreview(row)} className='flex w-full min-w-0 items-center gap-3 text-start' title={row.title}>
					<span className='relative size-11 shrink-0 overflow-hidden rounded-[12px] border border-(--gm-line)' style={{ background: 'color-mix(in srgb, var(--color-primary-50) 70%, var(--gm-paper))' }}>
						{row.imageUrl ? (
							<Img src={row.imageUrl} alt='' showBlur={false} className='h-full w-full object-cover' loading='lazy' />
						) : (
							<span className='grid h-full place-items-center text-(--color-primary-300)'><ChefHat className='size-5' strokeWidth={1.6} /></span>
						)}
					</span>
					<span className='min-w-0'>
						<span dir='auto' className='block truncate text-[13px] font-bold gm-ink'>{row.title}</span>
						<span className='mt-0.5 flex items-center gap-2 text-[11px] gm-muted'>
							<span className='inline-flex items-center gap-1'>
								<Utensils className='size-3' />
								<span className='font-en tabular-nums'>{row.ingredients.length}</span>
								{t('table.items')}
							</span>
							{row.videoUrl && (
								<span className='inline-flex items-center gap-1 text-(--color-secondary-600)'>
									<PlayCircle className='size-3' />
									{t('table.video')}
								</span>
							)}
						</span>
					</span>
				</button>
			),
		},
		{
			key: 'category',
			header: t('table.category'),
			cell: row => <MealTypeBadge type={row.category} t={t} />,
		},
		{
			key: 'satiety',
			header: t('table.satiety'),
			cell: row => <Badge color={SATIETY_COLOR[row.satiety] || 'slate'} dot>{satietyLabel(row.satiety, t)}</Badge>,
		},
		{
			key: 'nutrition',
			header: t('table.nutrition'),
			cell: row => <NutritionCell row={row} t={t} />,
		},
		{
			key: 'actions',
			header: t('table.actions'),
			headClassName: 'gm-col-end',
			className: 'gm-col-end',
			cell: row => (
				<GmRowActions
					options={[
						{ icon: Eye, tone: 'primary', label: t('table.view'), onClick: () => setPreview(row) },
						{ icon: PencilLine, tone: 'amber', label: t('table.edit'), onClick: () => openEdit(row) },
						{ icon: Trash2, tone: 'danger', label: t('table.delete'), onClick: () => setDeleteTarget(row) },
					]}
				/>
			),
		},
	], [t, openEdit]);

	const onPageChange = useCallback(({ page: nextPage, per_page }) => {
		const nextLimit = Number(per_page || perPage);
		if (nextLimit !== perPage) {
			setPerPage(nextLimit);
			setPage(1);
		} else {
			setPage(Number(nextPage || 1));
		}
	}, [perPage]);

	const queryTrim = search.trim();
	const chips = [
		queryTrim && { key: 'q', label: t('roster.searchLabel'), value: `“${queryTrim}”`, onRemove: () => onSearch('') },
		activeTab !== 'all' && { key: 'meal', label: t('roster.mealType'), value: activeMealName, onRemove: () => onTab('all') },
	].filter(Boolean);

	return (
		<div className='gm-surface rs-scope app-stack pb-4'>
			<div className='rs-summary'>
				<IntakeHero
					icon={BookMarked}
					title={t('page.title')}
					subtitle={t('page.desc')}
					ctaLabel={(
						<>
							<Plus className='size-4' strokeWidth={2} aria-hidden />
							<span>{t('addButton')}</span>
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
						{t('table.retry')}
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
						searching={search.trim() !== debouncedSearch}
						searchPlaceholder={t('search.placeholder')}
						searchLabel={t('roster.searchLabel')}
						clearSearchLabel={t('roster.clearAll')}
						filterLabel={t('roster.mealType')}
						filterCount={activeTab === 'all' ? 0 : 1}
						filterOpen={filterOpen}
						onFilterToggle={() => setFilterOpen(v => !v)}
						filterAnchorRef={filterAnchorRef}
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
							title={t('roster.mealType')}
							canReset={activeTab !== 'all'}
							onReset={() => onTab('all')}
							resetLabel={t('roster.reset')}
							doneLabel={t('roster.done')}
						>
							<div className='max-h-[min(60vh,420px)] overflow-y-auto'>
								<IntakeOptionGroup
									label={t('roster.mealType')}
									name='recipe-meal-type'
									options={mealOptions}
									value={activeTab}
									onChange={onTab}
								/>
							</div>
						</IntakeFilterPopover>
					</IntakeToolbar>
				)}
				columns={columns}
				data={recipes}
				isLoading={loading}
				rowKey={row => row.id}
				labels={{
					emptyTitle: err ? t('errors.load') : t('table.emptyTitle'),
					emptySubtitle: err ? t('table.retryHint') : hasFilters ? t('roster.emptyHint') : t('table.emptyStart'),
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
				title={t('preview.title')}
				maxW='max-w-3xl'
			>
				{preview && <RecipePreview recipe={preview} t={t} />}
			</Modal>

			<Modal
				cn='gm-modal-root'
				panelClassName={GM_MODAL}
				open={formOpen}
				onClose={closeForm}
				title={editRecipe ? t('slidePanel.editTitle') : t('slidePanel.addTitle')}
				maxW='max-w-3xl'
			>
				{formOpen && (
					<RecipeForm initial={editRecipe} mealTypes={mealTypes} saving={saving} onSubmit={handleSave} onCancel={closeForm} />
				)}
			</Modal>

			<Modal cn='gm-modal-root' panelClassName={GM_MODAL} open={!!deleteTarget} onClose={closeDelete} title={t('table.delete')} maxW='max-w-md'>
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
						<p dir='auto' className='truncate text-[13.5px] font-bold gm-ink'>{deleteTarget?.title || ''}</p>
						<p className='mt-1 text-[13px] leading-relaxed gm-ink-soft'>{t('table.confirmDelete')}</p>
					</div>
				</div>
				<div className='gm-modal-foot'>
					<Button color='neutral' name={t('slidePanel.cancel')} onClick={closeDelete} disabled={deleteLoading} />
					<Button
						color='red'
						name={t('table.delete')}
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
