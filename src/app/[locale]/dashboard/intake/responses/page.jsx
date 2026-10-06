'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'use-intl';
import { useRouter } from 'next/navigation';
import {
	AlertCircle,
	ArrowUpRight,
	Check,
	CheckCircle2,
	Clock,
	ExternalLink,
	Eye,
	FileText,
	Globe,
	Inbox,
	Layers,
	Mail,
	Phone,
	Plus,
	RefreshCw,
	Trash2,
} from 'lucide-react';

import api, { baseImg } from '@/utils/axios';
import MultiLangText from '@/components/atoms/MultiLangText';
import Img from '@/components/atoms/Img';
import Badge from '@/components/atoms/GmBadge';
import GmRowActions from '@/components/atoms/GmRowActions';
import GmStatCard from '@/components/molecules/GmStatCard';
import DataTable from '@/components/atoms/Datatable';
import { Modal } from '@/components/dashboard/ui/UI';
import { Notification } from '@/config/Notification';
import { IntakeHero, IntakeToolbar, IntakeFilterPopover, IntakeOptionGroup } from '@/components/pages/dashboard/intake/IntakeChrome';
import { getStoredPerPage, setStoredPerPage } from '@/lib/table-prefs';

const GM_MODAL = 'gm-modal';
const DEFAULT_LIMIT = 10;

// ─────────────────────────────────────────────────────────────
//  REVIEWED TOGGLE
// ─────────────────────────────────────────────────────────────
function ReviewedCell({ row, updatingReviewed, setReviewed, t }) {
	const formId = row.form_id ?? row.form?.id;
	const key = formId != null && row.id != null ? `${formId}-${row.id}` : '';
	const loading = key ? updatingReviewed.has(key) : false;
	const on = !!row.reviewed;

	return (
		<button
			type="button"
			role="switch"
			aria-checked={on}
			aria-label={t('review.aria_label')}
			disabled={loading}
			onClick={() => setReviewed(row, !on)}
			className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-semibold transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${on
				? 'border-[color-mix(in_srgb,var(--gm-ok)_30%,transparent)] bg-[color-mix(in_srgb,var(--gm-ok)_14%,var(--gm-paper))] text-(--gm-ok)'
				: 'border-(--gm-line) bg-[color-mix(in_srgb,var(--gm-paper)_80%,transparent)] gm-muted hover:text-(--color-primary-600)'
				}`}
		>
			{loading ? (
				<RefreshCw className="size-3.5 animate-spin" />
			) : (
				<span
					className={`grid size-4 place-items-center rounded-full ${on ? 'bg-(--gm-ok) text-white' : 'border border-current'}`}
				>
					{on ? <Check className="size-2.5" strokeWidth={3.5} /> : null}
				</span>
			)}
			{loading ? t('review.loading') : on ? t('review.checked') : t('review.label')}
		</button>
	);
}

// ─────────────────────────────────────────────────────────────
//  ANSWER RENDERING
// ─────────────────────────────────────────────────────────────
const isUrl = s => typeof s === 'string' && /^(https?:)?\/\//i.test(s.trim());
const isProbPath = s => typeof s === 'string' && /\/uploads\/|^uploads\/|^\/uploads\//i.test(s.trim());
const isImageUrl = s => typeof s === 'string' && /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(s.trim());

const normalizeUrl = raw => {
	if (!raw || typeof raw !== 'string') return '';
	const cleaned = raw.replace(/\\/g, '/').trim();
	if (isUrl(cleaned)) return cleaned;
	if (typeof baseImg !== 'undefined' && baseImg) {
		return cleaned.startsWith('/') ? `${baseImg}${cleaned}` : `${baseImg}/${cleaned}`;
	}
	return cleaned;
};

const extractFiles = val => {
	if (Array.isArray(val)) return val.filter(v => typeof v === 'string' && v.trim()).map(v => v.replace(/\\/g, '/').trim());
	if (typeof val === 'string') {
		const v = val.trim();
		if (v.toLowerCase().startsWith('upload') || isUrl(v) || isProbPath(v)) return [v.replace(/\\/g, '/').trim()];
	}
	return [];
};

function FileLink({ rawUrl }) {
	return (
		<a
			href={normalizeUrl(rawUrl)}
			target="_blank"
			rel="noopener noreferrer"
			className="inline-flex max-w-full items-center gap-1.5 truncate text-[12px] font-medium text-(--color-primary-600) underline-offset-2 hover:underline"
		>
			<ExternalLink className="size-3 shrink-0" />
			<span className="truncate">{rawUrl}</span>
		</a>
	);
}

function AnswerCard({ fieldKey, label, value }) {
	const files = extractFiles(value);
	const imageFiles = files.filter(isImageUrl);
	const otherFiles = files.filter(f => !isImageUrl(f));

	const out = value == null ? ''
		: Array.isArray(value) ? value.join(', ')
			: typeof value === 'object' ? JSON.stringify(value)
				: String(value);

	return (
		<div className="gm-answer">
			<div className="flex items-start justify-between gap-2">
				<MultiLangText dirAuto className="min-w-0 text-[11.5px] font-semibold gm-muted">
					{label}
				</MultiLangText>
				<span className="gm-plan__chip shrink-0 font-mono" dir="ltr">{fieldKey}</span>
			</div>

			<div className="mt-1.5 text-[13px]">
				{imageFiles.length > 0 ? (
					<div className="space-y-2.5">
						<div className="grid grid-cols-3 gap-2">
							{imageFiles.map((rawUrl, i) => (
								<a key={i} href={normalizeUrl(rawUrl)} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-[10px] border border-(--gm-line)">
									<Img src={rawUrl} alt={`${label} ${i + 1}`} className="aspect-square w-full object-cover transition-transform group-hover:scale-105" />
								</a>
							))}
						</div>
						{otherFiles.map((rawUrl, i) => <FileLink key={i} rawUrl={rawUrl} />)}
					</div>
				) : files.length > 0 ? (
					<div className="flex flex-col gap-1.5">
						{files.map((rawUrl, i) => <FileLink key={i} rawUrl={rawUrl} />)}
					</div>
				) : out ? (
					<MultiLangText className="wrap-break-word font-semibold gm-ink">{out}</MultiLangText>
				) : (
					<span className="gm-faint">—</span>
				)}
			</div>
		</div>
	);
}

function ContactRow({ icon: Icon, label, value, mono = false }) {
	return (
		<div className="gm-cred justify-start!">
			<span className="gm-cred__icon shrink-0">
				<Icon className="size-4" />
			</span>
			<div className="min-w-0">
				<p className="gm-cred__label">{label}</p>
				<p className={`gm-cred__value truncate ${mono ? 'font-mono text-[12px]!' : ''}`} dir="ltr">{value || '—'}</p>
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────
//  MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function SubmissionsPage() {
	const t = useTranslations('submissions');
	const router = useRouter();

	const [forms, setForms] = useState([]);
	const [allRows, setAllRows] = useState([]);
	const [updatingReviewed, setUpdatingReviewed] = useState(new Set());
	const [deletingId, setDeletingId] = useState(null);
	const [pendingDelete, setPendingDelete] = useState(null);

	const [loadingSubs, setLoadingSubs] = useState(true);
	const [selectedFormId, setSelectedFormId] = useState('all');
	const [reviewFilter, setReviewFilter] = useState('all');
	const [filterOpen, setFilterOpen] = useState(false);
	const filterAnchorRef = useRef(null);
	const [query, setQuery] = useState('');

	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(() => getStoredPerPage(DEFAULT_LIMIT));

	const [selectedSubmission, setSelectedSubmission] = useState(null);
	const [showSubmissionModal, setShowSubmissionModal] = useState(false);

	const [debouncedQuery, setDebouncedQuery] = useState('');
	const debounceTimer = useRef(null);

	useEffect(() => {
		clearTimeout(debounceTimer.current);
		debounceTimer.current = setTimeout(() => setDebouncedQuery(query), 300);
		return () => clearTimeout(debounceTimer.current);
	}, [query]);

	const normalizeSubmission = sub => ({
		...sub,
		form_id: sub?.form?.id ?? sub?.form_id ?? null,
	});

	const loadForms = useCallback(async () => {
		try {
			const res = await api.get('/forms');
			const list = res?.data?.data || res?.data || [];
			setForms(Array.isArray(list) ? list : []);
		} catch {
			Notification(t('messages.load_forms_failed'), 'error');
		}
	}, [t]);

	const loadSubmissions = useCallback(async () => {
		if (!forms.length) {
			setAllRows([]);
			setLoadingSubs(false);
			return;
		}
		setLoadingSubs(true);
		try {
			const targets = selectedFormId === 'all'
				? forms
				: forms.filter(f => String(f.id) === String(selectedFormId));
			const results = await Promise.all(targets.map(f =>
				api.get(`/forms/${f.id}/submissions`, { params: { page: 1, limit: 1000 } })
					.then(r => (r?.data?.data || r?.data || []).map(normalizeSubmission))
					.catch(() => []),
			));
			setAllRows(results.flat().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
		} catch {
			Notification(t('messages.load_submissions_failed'), 'error');
		} finally {
			setLoadingSubs(false);
		}
	}, [forms, selectedFormId, t]);

	useEffect(() => { loadForms(); }, [loadForms]);
	useEffect(() => { loadSubmissions(); }, [loadSubmissions]);
	useEffect(() => { setPage(1); }, [selectedFormId, debouncedQuery, reviewFilter, limit]);

	const formTitleOf = useCallback(
		id => forms.find(f => f.id == id)?.title || t('labels.unknown_form'),
		[forms, t],
	);

	const matchesQuery = useCallback((s, q) => {
		if (!q) return true;
		const formTitle = formTitleOf(s.form_id).toLowerCase();
		const inAnswers = s.answers && Object.values(s.answers).some(v =>
			String(Array.isArray(v) ? v.join(', ') : v).toLowerCase().includes(q),
		);
		return (
			formTitle.includes(q) ||
			(s.email || '').toLowerCase().includes(q) ||
			(s.phone || '').toLowerCase().includes(q) ||
			(s.ipAddress || '').toLowerCase().includes(q) ||
			inAnswers
		);
	}, [formTitleOf]);

	const filtered = useMemo(() => {
		const q = (debouncedQuery || '').trim().toLowerCase();
		return allRows.filter(s => {
			if (reviewFilter === 'waiting' && s.reviewed) return false;
			if (reviewFilter === 'reviewed' && !s.reviewed) return false;
			return matchesQuery(s, q);
		});
	}, [allRows, reviewFilter, debouncedQuery, matchesQuery]);

	const submissions = useMemo(() => {
		const start = (page - 1) * limit;
		return filtered.slice(start, start + limit);
	}, [filtered, page, limit]);

	const inboxStats = useMemo(() => ({
		total: allRows.length,
		reviewed: allRows.filter(s => s.reviewed).length,
		waiting: allRows.filter(s => !s.reviewed).length,
		uniqueForms: new Set(allRows.map(s => String(s.form_id ?? ''))).size,
	}), [allRows]);

	const total = filtered.length;

	// ── Callbacks ──
	const viewSubmission = useCallback(submission => {
		setSelectedSubmission(submission);
		setShowSubmissionModal(true);
	}, []);

	const setReviewed = useCallback(async (row, checked) => {
		const formId = row.form_id ?? row.form?.id;
		if (formId == null || row.id == null) return;
		const key = `${formId}-${row.id}`;
		setUpdatingReviewed(prev => new Set([...prev, key]));
		try {
			await api.patch(`/forms/${formId}/submissions/${row.id}`, { reviewed: !!checked });
			const patch = s => (s.id === row.id ? { ...s, reviewed: !!checked } : s);
			setAllRows(prev => prev.map(patch));
			setSelectedSubmission(prev => (prev?.id === row.id ? { ...prev, reviewed: !!checked } : prev));
		} catch {
			Notification(t('messages.update_reviewed_failed'), 'error');
		} finally {
			setUpdatingReviewed(prev => { const next = new Set(prev); next.delete(key); return next; });
		}
	}, [t]);

	const deleteSubmission = useCallback(async row => {
		const formId = row.form_id ?? row.form?.id;
		if (formId == null || row.id == null) return;
		setDeletingId(row.id);
		try {
			await api.delete(`/forms/${formId}/submissions/${row.id}`);
			setAllRows(prev => prev.filter(s => s.id !== row.id));
			if (selectedSubmission?.id === row.id) { setShowSubmissionModal(false); setSelectedSubmission(null); }
			Notification(t('messages.delete_success'), 'success');
		} catch {
			Notification(t('messages.delete_failed'), 'error');
		} finally {
			setDeletingId(null);
			setPendingDelete(null);
		}
	}, [selectedSubmission?.id, t]);

	// ── Columns ──
	const columns = useMemo(() => [
		{
			key: 'form',
			header: t('table.form'),
			className: 'gm-wrap',
			cell: row => (
				<button
					type="button"
					onClick={() => viewSubmission(row)}
					className="flex w-full min-w-0 items-center gap-3 text-start"
				>
					<span className="gm-plan__icon size-10!">
						<FileText className="size-[18px]" strokeWidth={1.8} />
					</span>
					<span className="min-w-0">
						<MultiLangText className="block truncate text-[13px] font-semibold gm-ink">
							{formTitleOf(row.form_id)}
						</MultiLangText>
						<span className="mt-0.5 flex items-center gap-1 text-[11px] font-en gm-faint">
							<Clock className="size-3" />
							{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
						</span>
					</span>
				</button>
			),
		},
		{
			key: 'contact',
			header: t('detail.contact'),
			cell: row => (
				<div className="min-w-0 space-y-0.5 font-en" dir="ltr">
					<p className="flex items-center gap-1.5 truncate text-[12.5px] font-medium gm-ink-soft">
						<Mail className="size-3.5 shrink-0 gm-faint" />
						{row.email || <span className="gm-faint">—</span>}
					</p>
					<p className="flex items-center gap-1.5 truncate text-[12px] gm-muted">
						<Phone className="size-3.5 shrink-0 gm-faint" />
						{row.phone || <span className="gm-faint">—</span>}
					</p>
				</div>
			),
		},
		{
			key: 'ipAddress',
			header: t('table.ip'),
			cell: row => (
				<span className="gm-plan__chip font-mono" dir="ltr">
					<Globe className="size-3" />
					{row.ipAddress || '—'}
				</span>
			),
		},
		{
			key: 'reviewed',
			header: t('table.reviewed'),
			cell: row => (
				<ReviewedCell row={row} updatingReviewed={updatingReviewed} setReviewed={setReviewed} t={t} />
			),
		},
		{
			key: 'actions',
			header: t('table.actions'),
			headClassName: 'gm-col-end',
			className: 'gm-col-end',
			cell: row => (
				<GmRowActions
					options={[
						{ icon: Eye, tone: 'primary', label: t('actions.view'), onClick: () => viewSubmission(row) },
						{
							icon: deletingId === row.id ? RefreshCw : Trash2,
							tone: 'danger',
							label: t('actions.delete', { default: 'Delete' }),
							loading: deletingId === row.id,
							onClick: () => setPendingDelete(row),
						},
					]}
				/>
			),
		},
	], [t, updatingReviewed, deletingId, setReviewed, viewSubmission, formTitleOf]);

	const formOptions = useMemo(() => ([
		{ id: 'all', name: t('filters.all_forms'), icon: Layers },
		...forms.map(f => ({ id: String(f.id), name: f.title, icon: FileText })),
	]), [forms, t]);

	const reviewSegments = [
		{ id: 'all', name: t('roster.all'), short: t('roster.all'), icon: Inbox },
		{ id: 'waiting', name: t('roster.waiting'), short: t('roster.waiting'), icon: Clock },
		{ id: 'reviewed', name: t('roster.reviewed'), short: t('roster.reviewed'), icon: CheckCircle2 },
	];

	const queryTrim = query.trim();
	const selectedFormName = formOptions.find(o => String(o.id) === String(selectedFormId))?.name;
	const chips = [
		queryTrim && { key: 'q', label: t('roster.searchLabel'), value: `“${queryTrim}”`, onRemove: () => setQuery('') },
		reviewFilter !== 'all' && {
			key: 'review',
			label: t('table.reviewed'),
			value: reviewSegments.find(s => s.id === reviewFilter)?.name,
			onRemove: () => setReviewFilter('all'),
		},
		selectedFormId !== 'all' && {
			key: 'form',
			label: t('roster.formFilter'),
			value: selectedFormName,
			onRemove: () => setSelectedFormId('all'),
		},
	].filter(Boolean);

	const statCards = [
		{
			key: 'total', title: t('labels.total'), value: inboxStats.total, icon: Inbox,
			hint: t('stats.totalHint'), tone: 'gm-chip',
			stroke: 'var(--color-primary-500)', fill: 'var(--color-primary-400)', seed: 0.4, max: Math.max(inboxStats.total, 1),
		},
		{
			key: 'waiting', title: t('roster.waiting'), value: inboxStats.waiting, icon: Clock,
			hint: t('stats.shownHint'), tone: 'gm-chip-warn',
			stroke: 'var(--gm-warn)', fill: 'var(--gm-warn)', seed: 0.9, max: Math.max(inboxStats.total, 1),
			onClick: inboxStats.waiting > 0 ? () => setReviewFilter('waiting') : undefined,
		},
		{
			key: 'reviewed', title: t('review.checked'), value: inboxStats.reviewed, icon: CheckCircle2,
			hint: t('stats.reviewedHint'), tone: 'gm-chip-ok',
			stroke: 'var(--gm-ok)', fill: 'var(--gm-ok)', seed: 1.4, max: Math.max(inboxStats.total, 1),
		},
		{
			key: 'forms', title: t('labels.forms'), value: inboxStats.uniqueForms, icon: Layers,
			hint: t('stats.formsHint'), tone: 'gm-chip-secondary',
			stroke: 'var(--color-secondary-500)', fill: 'var(--color-secondary-400)', seed: 1.9, max: Math.max(forms.length, 1),
		},
	];

	const closeDelete = () => { if (!deletingId) setPendingDelete(null); };
	const answersCount = Object.keys(selectedSubmission?.answers || {}).length;
	const selectedForm = selectedSubmission
		? forms.find(f => f.id == (selectedSubmission.form_id ?? selectedSubmission.form?.id))
		: null;
	const fieldsByKey = new Map((selectedForm?.fields || []).map(fld => [fld.key, fld]));

	return (
		<div className="gm-surface rs-scope app-stack pb-4">
			<div className="rs-summary">
				<IntakeHero
					icon={Inbox}
					title={t('header.title')}
					subtitle={t('header.desc')}
					ctaLabel={<><Plus className="size-4" strokeWidth={2} aria-hidden /><span>{t('header.new')}</span></>}
					onCta={() => router.push('/dashboard/intake/forms')}
					extra={inboxStats.waiting > 0 ? (
						<button type="button" className="rs-review" onClick={() => setReviewFilter('waiting')}>
							{t('roster.reviewPending', { count: inboxStats.waiting })}
							<ArrowUpRight className="size-3.5" strokeWidth={2.2} aria-hidden />
						</button>
					) : null}
				/>
				<section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{statCards.map((card, index) => (
						<GmStatCard key={card.key} card={card} index={index} />
					))}
				</section>
			</div>

			<DataTable
				hideToolbar
				compact
				toolbar={(
					<IntakeToolbar
						search={query}
						onSearch={(v) => { setQuery(v); setPage(1); }}
						searching={query !== debouncedQuery}
						searchPlaceholder={t('filters.search_placeholder')}
						searchLabel={t('roster.searchLabel')}
						clearSearchLabel={t('roster.clearAll')}
						segments={reviewSegments}
						segment={reviewFilter}
						onSegment={(id) => { setReviewFilter(id); setPage(1); }}
						segmentLabel={t('table.reviewed')}
						layoutId="intake-subs-seg"
						filterLabel={t('roster.filters')}
						filterCount={selectedFormId === 'all' ? 0 : 1}
						filterOpen={filterOpen}
						onFilterToggle={() => setFilterOpen(v => !v)}
						filterAnchorRef={filterAnchorRef}
						result={t.rich('roster.resultCount', {
							count: filtered.length,
							strong: (chunks) => <strong>{chunks}</strong>,
						})}
						chips={chips}
						onClearAll={() => { setQuery(''); setReviewFilter('all'); setSelectedFormId('all'); setPage(1); }}
						clearAllLabel={t('roster.clearAll')}
						activeFiltersLabel={t('roster.activeFilters')}
					>
						<IntakeFilterPopover
							open={filterOpen}
							anchorRef={filterAnchorRef}
							onClose={() => setFilterOpen(false)}
							title={t('roster.formFilter')}
							canReset={selectedFormId !== 'all'}
							onReset={() => setSelectedFormId('all')}
							resetLabel={t('roster.reset')}
							doneLabel={t('roster.done')}
						>
							<IntakeOptionGroup
								label={t('roster.formFilter')}
								name="intake-form"
								options={formOptions}
								value={selectedFormId}
								onChange={(id) => { setSelectedFormId(id); setPage(1); }}
							/>
						</IntakeFilterPopover>
					</IntakeToolbar>
				)}
				columns={columns}
				data={submissions}
				isLoading={loadingSubs}
				rowKey={row => row.id}
				labels={{
					emptyTitle: t('empty.title'),
					emptySubtitle: chips.length ? t('roster.emptyHint') : (selectedFormId === 'all' ? t('empty.subtitle_all') : t('empty.subtitle_one')),
				}}
				pagination={{ current_page: page, per_page: limit, total_records: total }}
				onPageChange={({ page: nextPage, per_page }) => {
					const nextLimit = Number(per_page ?? limit);
					setStoredPerPage(nextLimit);
					setLimit(nextLimit);
					setPage(Number(nextPage ?? 1));
				}}
				perPageOptions={[10, 20, 30, 50]}
				hoverable
			/>

			<Modal
				cn="gm-modal-root"
				panelClassName={GM_MODAL}
				open={!!pendingDelete}
				onClose={closeDelete}
				title={t('actions.delete')}
				maxW="max-w-md"
			>
				<div className="space-y-5">
					<div
						className="flex items-start gap-3 rounded-[14px] border p-4"
						style={{
							borderColor: 'color-mix(in srgb, var(--gm-danger) 25%, transparent)',
							background: 'color-mix(in srgb, var(--gm-danger) 8%, var(--gm-paper))',
						}}
					>
						<span
							className="grid size-9 shrink-0 place-items-center rounded-[11px]"
							style={{ color: 'var(--gm-danger)', background: 'color-mix(in srgb, var(--gm-danger) 14%, var(--gm-paper))' }}
						>
							<AlertCircle className="size-[18px]" />
						</span>
						<p className="flex-1 text-[13px] leading-relaxed gm-ink-soft">{t('actions.confirm_delete')}</p>
					</div>
					<div className="gm-modal-foot">
						<button type="button" onClick={closeDelete} className="gm-btn-ghost rounded-[11px] px-4 py-2 text-[13px] font-medium">
							{t('actions.cancel')}
						</button>
						<button
							type="button"
							onClick={() => pendingDelete && deleteSubmission(pendingDelete)}
							disabled={!!deletingId}
							className="inline-flex h-10 items-center gap-2 rounded-[11px] px-5 text-[13px] font-semibold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
							style={{ background: 'var(--gm-danger)', boxShadow: '0 6px 14px color-mix(in srgb, var(--gm-danger) 25%, transparent)' }}
						>
							{deletingId ? <RefreshCw className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
							{t('actions.delete')}
						</button>
					</div>
				</div>
			</Modal>

			<Modal
				cn="gm-modal-root"
				panelClassName={GM_MODAL}
				open={showSubmissionModal && !!selectedSubmission}
				onClose={() => setShowSubmissionModal(false)}
				title={t('detail.title')}
				maxW="max-w-4xl"
			>
				{selectedSubmission && (
					<div className="space-y-5">
						<div className="gm-builder-head">
							<span className="gm-builder-head__mark">
								<FileText className="size-5" strokeWidth={1.8} />
							</span>
							<div className="min-w-0 flex-1">
								<MultiLangText className="truncate text-[16px] font-bold gm-ink">
									{formTitleOf(selectedSubmission.form_id)}
								</MultiLangText>
								<p className="mt-1 flex items-center gap-1.5 text-[12px] font-medium gm-muted">
									<Clock className="size-3.5" />
									{selectedSubmission.created_at ? new Date(selectedSubmission.created_at).toLocaleString() : '—'}
								</p>
							</div>
							<Badge color={selectedSubmission.reviewed ? 'green' : 'slate'} dot>
								{selectedSubmission.reviewed ? t('review.checked') : t('review.unchecked')}
							</Badge>
						</div>

						<div>
							<p className="mb-2.5 text-[12px] font-bold gm-ink">{t('detail.contact')}</p>
							<div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
								<ContactRow icon={Mail} label={t('table.email')} value={selectedSubmission.email} />
								<ContactRow icon={Phone} label={t('table.phone')} value={selectedSubmission.phone} />
								<ContactRow icon={Globe} label={t('table.ip')} value={selectedSubmission.ipAddress} mono />
							</div>
						</div>

						<div>
							<div className="mb-2.5 flex items-center gap-2">
								<p className="text-[12px] font-bold gm-ink">{t('detail.answers')}</p>
								<Badge color="primary">{answersCount}</Badge>
							</div>
							{answersCount ? (
								<div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
									{Object.entries(selectedSubmission.answers).map(([key, value]) => (
										<AnswerCard key={key} fieldKey={key} label={fieldsByKey.get(key)?.label || key} value={value} />
									))}
								</div>
							) : (
								<p className="text-[13px] gm-muted">{t('detail.no_answers')}</p>
							)}
						</div>

						<div className="gm-modal-foot">
							<button
								type="button"
								onClick={() => setReviewed(selectedSubmission, !selectedSubmission.reviewed)}
								className="gm-btn-ghost inline-flex items-center gap-2 rounded-[11px] px-4 py-2 text-[13px] font-medium"
							>
								<CheckCircle2 className="size-4" />
								{selectedSubmission.reviewed ? t('roster.markUnreviewed') : t('roster.markReviewed')}
							</button>
							<button
								type="button"
								onClick={() => setPendingDelete(selectedSubmission)}
								className="inline-flex h-10 items-center gap-2 rounded-[11px] px-5 text-[13px] font-semibold text-white"
								style={{ background: 'var(--gm-danger)', boxShadow: '0 6px 14px color-mix(in srgb, var(--gm-danger) 25%, transparent)' }}
							>
								<Trash2 className="size-4" />
								{t('actions.delete')}
							</button>
						</div>
					</div>
				)}
			</Modal>
		</div>
	);
}
