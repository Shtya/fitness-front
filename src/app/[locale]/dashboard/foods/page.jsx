'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	AlertCircle, Apple, BadgeCheck, Database, Flame, Globe2, Layers, Lock, PencilLine, Plus, RefreshCw, Save, Trash2, Users, XCircle,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import api from '@/utils/axios';
import { Modal } from '@/components/dashboard/ui/UI';
import Button from '@/components/atoms/Button';
import Badge from '@/components/atoms/GmBadge';
import GmRowActions from '@/components/atoms/GmRowActions';
import DataTable from '@/components/atoms/Datatable';
import { GmCheck } from '@/components/atoms/GmFormParts';
import { Notification } from '@/config/Notification';
import useDebounced from '@/hooks/useDebounced';
import { useUser } from '@/hooks/useUser';
import { IntakeHero, IntakeToolbar, IntakeFilterPopover, IntakeOptionGroup } from '@/components/pages/dashboard/intake/IntakeChrome';
import { FoodFields, emptyFoodDraft, foodToDraft, saveFood, validateFoodDraft } from '@/components/pages/dashboard/foods/FoodForm';
import { FOOD_CATEGORIES, foodName } from '@/lib/food-nutrition';

const GM_MODAL = 'gm-modal';
const PER_PAGE_OPTIONS = [10, 25, 50, 100];
const fmt = n => (n == null ? '—' : Math.round(Number(n) * 10) / 10);

function NutritionCell({ row, t }) {
	const unit = row.baseUnit === 'ml' ? t('form.unit_ml') : t('form.unit_g');
	return (
		<div className='flex flex-wrap items-center gap-x-2.5 gap-y-1' dir='ltr'>
			<span className='gm-plan__chip font-en tabular-nums text-(--color-primary-700)!'>
				<Flame className='size-3' />
				{fmt(row.kcal)}
				<span className='font-normal gm-faint'>/100{unit}</span>
			</span>
			{['protein', 'carbs', 'fat', 'fiber', 'sugar'].map(key => (
				<span key={key} className='font-en text-[11.5px] tabular-nums gm-ink-soft' title={t(`macros.${key}`)}>
					<span className='gm-muted'>{t(`macros.${key}_short`)}</span> {row[key] == null ? '—' : `${fmt(row[key])}g`}
				</span>
			))}
		</div>
	);
}

function FoodEditor({ food, isSuper, onSaved, onCancel, t }) {
	const [draft, setDraft] = useState(() => (food ? foodToDraft(food) : emptyFoodDraft()));
	const [verified, setVerified] = useState(food ? Boolean(food.verified) : true);
	const [errors, setErrors] = useState({});
	const [saving, setSaving] = useState(false);

	const onChange = (key, value) => {
		setDraft(d => ({ ...d, [key]: value }));
		if (Object.keys(errors).length) setErrors({});
	};

	const submit = async () => {
		const next = validateFoodDraft(draft, t);
		setErrors(next);
		if (Object.keys(next).length) return;
		setSaving(true);
		try {
			await saveFood(draft, food?.id, isSuper ? { verified } : undefined);
			Notification(t(food?.id ? 'toasts.updated' : 'toasts.created'), 'success');
			onSaved();
		} catch (e) {
			Notification(e?.response?.data?.message || t('errors.save'), 'error');
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className='space-y-4'>
			<FoodFields draft={draft} onChange={onChange} errors={errors} />
			{isSuper && <GmCheck checked={verified} onChange={setVerified} label={t('form.verified')} />}
			<div className='gm-modal-foot'>
				<Button color='neutral' name={t('actions.cancel')} onClick={onCancel} disabled={saving} />
				<Button color='primary' name={t('actions.save')} onClick={submit} loading={saving} disabled={saving} icon={<Save className='size-4' />} />
			</div>
		</div>
	);
}

export default function FoodsPage() {
	const t = useTranslations('foods');
	const locale = useLocale();
	const user = useUser();
	const isSuper = user?.role === 'super_admin';

	const [rows, setRows] = useState([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [err, setErr] = useState(null);

	const [search, setSearch] = useState('');
	const debouncedSearch = useDebounced(search, 350);
	const [scope, setScope] = useState('all');
	const [category, setCategory] = useState('all');
	const [page, setPage] = useState(1);
	const [perPage, setPerPage] = useState(25);
	const [filterOpen, setFilterOpen] = useState(false);
	const filterAnchorRef = useRef(null);

	const [editing, setEditing] = useState(null);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [deleteLoading, setDeleteLoading] = useState(false);

	const reqId = useRef(0);
	const abortRef = useRef(null);

	useEffect(() => {
		document.documentElement.dataset.gmUsers = '1';
		return () => { delete document.documentElement.dataset.gmUsers; };
	}, []);

	const fetchFoods = useCallback(async () => {
		abortRef.current?.abort();
		const ctrl = new AbortController();
		abortRef.current = ctrl;
		const myId = ++reqId.current;
		setLoading(true);
		setErr(null);
		try {
			const params = { page, limit: perPage, scope };
			const q = debouncedSearch.trim();
			if (q) params.q = q;
			if (category !== 'all') params.category = category;
			const res = await api.get('/foods', { params, signal: ctrl.signal });
			if (myId !== reqId.current) return;
			setRows(res?.data?.items || []);
			setTotal(Number(res?.data?.total || 0));
		} catch (e) {
			if (e?.name === 'CanceledError' || myId !== reqId.current) return;
			setRows([]);
			setTotal(0);
			setErr(e?.response ? e.response.data?.message || t('errors.load') : t('errors.server_unreachable'));
		} finally {
			if (myId === reqId.current) setLoading(false);
		}
	}, [page, perPage, scope, category, debouncedSearch, t]);

	useEffect(() => { fetchFoods(); }, [fetchFoods]);
	useEffect(() => () => abortRef.current?.abort(), []);

	const onSearch = useCallback(v => { setSearch(v); setPage(1); }, []);
	const onScope = useCallback(v => { setScope(v); setPage(1); }, []);
	const onCategory = useCallback(v => { setCategory(v); setPage(1); }, []);
	const clearFilters = useCallback(() => { setSearch(''); setScope('all'); setCategory('all'); setPage(1); }, []);
	const hasFilters = Boolean(search) || scope !== 'all' || category !== 'all';

	const scopeOptions = useMemo(() => [
		{ id: 'all', name: t('scope.all'), icon: Layers },
		{ id: 'global', name: t('scope.global'), icon: Globe2 },
		{ id: 'mine', name: t('scope.mine'), icon: Users },
	], [t]);
	const categoryOptions = useMemo(() => [
		{ id: 'all', name: t('categories.all'), icon: Layers },
		...FOOD_CATEGORIES.map(c => ({ id: c, name: t(`categories.${c}`), icon: Apple })),
	], [t]);

	const closeEditor = useCallback(() => setEditing(null), []);
	const onSaved = useCallback(() => {
		setEditing(null);
		fetchFoods();
	}, [fetchFoods]);

	const closeDelete = useCallback(() => { if (!deleteLoading) setDeleteTarget(null); }, [deleteLoading]);
	const handleDelete = useCallback(async () => {
		if (!deleteTarget) return;
		setDeleteLoading(true);
		try {
			await api.delete(`/foods/${deleteTarget.id}`);
			Notification(t('toasts.deleted'), 'success');
			setDeleteTarget(null);
			if (rows.length === 1 && page > 1) setPage(p => p - 1);
			else fetchFoods();
		} catch (e) {
			Notification(e?.response?.data?.message || t('errors.delete'), 'error');
		} finally {
			setDeleteLoading(false);
		}
	}, [deleteTarget, rows.length, page, fetchFoods, t]);

	const columns = useMemo(() => [
		{
			key: 'name',
			header: t('table.name'),
			headClassName: 'min-w-[220px]',
			className: 'gm-wrap',
			cell: row => {
				const secondary = locale === 'ar' ? row.nameEn : row.nameAr;
				const piece = row.pieceGrams ? `${(locale === 'ar' ? row.pieceLabelAr : row.pieceLabelEn) || t('table.piece')} = ${fmt(row.pieceGrams)}g` : '';
				return (
					<span className='block min-w-0'>
						<span className='flex items-center gap-1.5'>
							<span dir='auto' className='truncate text-[13px] font-bold gm-ink'>{foodName(row, locale)}</span>
							{row.verified ? <BadgeCheck className='size-3.5 shrink-0 text-(--color-primary-500)' aria-label={t('badges.verified')} /> : null}
						</span>
						<span className='mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] gm-muted'>
							{secondary ? <span dir='auto' className='truncate'>{secondary}</span> : null}
							{piece ? <span className='font-en tabular-nums'>{piece}</span> : null}
						</span>
					</span>
				);
			},
		},
		{
			key: 'category',
			header: t('table.category'),
			cell: row => <Badge color='slate'>{t(`categories.${row.category}`)}</Badge>,
		},
		{
			key: 'nutrition',
			header: t('table.per_100'),
			cell: row => <NutritionCell row={row} t={t} />,
		},
		{
			key: 'scope',
			header: t('table.scope'),
			cell: row => (row.scope === 'global'
				? <Badge color='blue' icon={<Globe2 className='size-3' />}>{t('badges.global')}</Badge>
				: <Badge color='primary' icon={<Users className='size-3' />}>{t('badges.team')}</Badge>),
		},
		{
			key: 'actions',
			header: t('table.actions'),
			headClassName: 'gm-col-end',
			className: 'gm-col-end',
			cell: row => (row.canEdit ? (
				<GmRowActions
					options={[
						{ icon: PencilLine, tone: 'amber', label: t('actions.edit'), onClick: () => setEditing(row) },
						{ icon: Trash2, tone: 'danger', label: t('actions.delete'), onClick: () => setDeleteTarget(row) },
					]}
				/>
			) : (
				<span className='inline-flex items-center gap-1 text-[11px] gm-faint' title={t('table.read_only_hint')}>
					<Lock className='size-3' />
					{t('table.read_only')}
				</span>
			)),
		},
	], [t, locale]);

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
		queryTrim && { key: 'q', label: t('toolbar.search_label'), value: `“${queryTrim}”`, onRemove: () => onSearch('') },
		scope !== 'all' && { key: 'scope', label: t('toolbar.scope'), value: t(`scope.${scope}`), onRemove: () => onScope('all') },
		category !== 'all' && { key: 'category', label: t('toolbar.category'), value: t(`categories.${category}`), onRemove: () => onCategory('all') },
	].filter(Boolean);

	return (
		<div className='gm-surface rs-scope app-stack pb-4'>
			<div className='rs-summary'>
				<IntakeHero
					icon={Database}
					title={t('page.title')}
					subtitle={t('page.desc')}
					ctaLabel={(
						<>
							<Plus className='size-4' strokeWidth={2} aria-hidden />
							<span>{t('actions.add')}</span>
						</>
					)}
					onCta={() => setEditing({})}
				/>
			</div>

			{err && (
				<div role='alert' className='flex flex-wrap items-center gap-2 rounded-[14px] border border-rose-200/70 bg-rose-50/80 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300'>
					<XCircle className='size-4 shrink-0' />
					<span className='min-w-0 flex-1'>{err}</span>
					<button type='button' onClick={fetchFoods} disabled={loading} className='gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5 disabled:opacity-60'>
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
						searching={search.trim() !== debouncedSearch}
						searchPlaceholder={t('toolbar.search_placeholder')}
						searchLabel={t('toolbar.search_label')}
						clearSearchLabel={t('toolbar.clear_all')}
						filterLabel={t('toolbar.filters')}
						filterCount={(scope !== 'all' ? 1 : 0) + (category !== 'all' ? 1 : 0)}
						filterOpen={filterOpen}
						onFilterToggle={() => setFilterOpen(v => !v)}
						filterAnchorRef={filterAnchorRef}
						result={t.rich('toolbar.result_count', { count: total, strong: chunks => <strong>{chunks}</strong> })}
						chips={chips}
						onClearAll={clearFilters}
						clearAllLabel={t('toolbar.clear_all')}
						activeFiltersLabel={t('toolbar.active_filters')}
					>
						<IntakeFilterPopover
							open={filterOpen}
							anchorRef={filterAnchorRef}
							onClose={() => setFilterOpen(false)}
							title={t('toolbar.filters')}
							canReset={scope !== 'all' || category !== 'all'}
							onReset={() => { onScope('all'); onCategory('all'); }}
							resetLabel={t('toolbar.reset')}
							doneLabel={t('toolbar.done')}
						>
							<div className='max-h-[min(60vh,420px)] overflow-y-auto'>
								<IntakeOptionGroup label={t('toolbar.scope')} name='food-scope' options={scopeOptions} value={scope} onChange={onScope} />
								<IntakeOptionGroup label={t('toolbar.category')} name='food-category' options={categoryOptions} value={category} onChange={onCategory} />
							</div>
						</IntakeFilterPopover>
					</IntakeToolbar>
				)}
				columns={columns}
				data={rows}
				isLoading={loading}
				rowKey={row => row.id}
				labels={{
					emptyTitle: err ? t('errors.load') : t('table.empty_title'),
					emptySubtitle: err ? t('table.retry_hint') : hasFilters ? t('table.empty_filtered') : t('table.empty_start'),
				}}
				pagination={{ current_page: page, per_page: perPage, total_records: total }}
				onPageChange={onPageChange}
				perPageOptions={PER_PAGE_OPTIONS}
				hoverable
			/>

			<Modal
				cn='gm-modal-root'
				panelClassName={GM_MODAL}
				open={Boolean(editing)}
				onClose={closeEditor}
				title={editing?.id ? t('modal.edit_title') : t('modal.add_title')}
				maxW='max-w-3xl'
			>
				{editing && <FoodEditor key={editing.id || 'new'} food={editing.id ? editing : null} isSuper={isSuper} onSaved={onSaved} onCancel={closeEditor} t={t} />}
			</Modal>

			<Modal cn='gm-modal-root' panelClassName={GM_MODAL} open={!!deleteTarget} onClose={closeDelete} title={t('actions.delete')} maxW='max-w-md'>
				<div
					className='flex items-start gap-3 rounded-[14px] border p-4'
					style={{ borderColor: 'color-mix(in srgb, var(--gm-danger) 25%, transparent)', background: 'color-mix(in srgb, var(--gm-danger) 8%, var(--gm-paper))' }}
				>
					<span className='grid size-9 shrink-0 place-items-center rounded-[11px]' style={{ color: 'var(--gm-danger)', background: 'color-mix(in srgb, var(--gm-danger) 14%, var(--gm-paper))' }}>
						<AlertCircle className='size-[18px]' />
					</span>
					<div className='min-w-0 flex-1'>
						<p dir='auto' className='truncate text-[13.5px] font-bold gm-ink'>{deleteTarget ? foodName(deleteTarget, locale) : ''}</p>
						<p className='mt-1 text-[13px] leading-relaxed gm-ink-soft'>{t('modal.confirm_delete')}</p>
					</div>
				</div>
				<div className='gm-modal-foot'>
					<Button color='neutral' name={t('actions.cancel')} onClick={closeDelete} disabled={deleteLoading} />
					<Button color='red' name={t('actions.delete')} onClick={handleDelete} loading={deleteLoading} disabled={deleteLoading} icon={<Trash2 className='size-4' />} />
				</div>
			</Modal>
		</div>
	);
}
