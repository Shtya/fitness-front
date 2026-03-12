'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import qs from 'qs';
import { useTranslations } from 'next-intl';

import api from '@/utils/axios';
import Img from '@/components/atoms/Img';
import Select from '@/components/atoms/Select';
import { Modal, StatCard, TabsPill } from '@/components/dashboard/ui/UI';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import { useUser } from '@/hooks/useUser';


import {
	Loader2,
	Eye,
	CheckCircle2,
	XCircle,
	User2,
	CalendarDays,
	HeartPulse,
	Activity,
	ClipboardList,
	Sparkles,
	FileText,
	MessageSquareText,
} from 'lucide-react';
import ActionButtons from '@/components/atoms/Actions';
import DataTable, { FilterField } from '@/components/atoms/Datatable';

/* ─── Constants ──────────────────────────────────────────────── */
const DEFAULT_LIMIT = 10;
const PER_PAGE_OPTIONS = [10, 20, 30, 50];
const cx = (...c) => c.filter(Boolean).join(' ');

/* ─────────────────────────────────────────────────────────────
	 DESIGN PRIMITIVES  (aligned with system from other pages)
───────────────────────────────────────────────────────────── */

/** Elevated card — consistent with Card used across all pages */
function Card({ children, className = '', accent = false }) {
	return (
		<div
			className={cx('relative overflow-hidden rounded-lg border bg-white', className)}
			style={{
				borderColor: 'var(--color-primary-100)',
				boxShadow: '0 1px 3px rgba(15,23,42,0.05), 0 8px 24px rgba(15,23,42,0.06)',
			}}
		>
			{accent && (
				<div
					className="absolute inset-x-0 top-0 h-0.5"
					style={{ background: 'linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to))' }}
				/>
			)}
			{children}
		</div>
	);
}

/** Semantic status pill */
function Pill({ children, tone = 'primary' }) {
	const tones = {
		primary: { border: 'var(--color-primary-200)', bg: 'var(--color-primary-50)', text: 'var(--color-primary-800)' },
		soft: { border: '#e2e8f0', bg: '#f8fafc', text: '#475569' },
		warn: { border: '#fde68a', bg: '#fffbeb', text: '#92400e' },
		ok: { border: '#bbf7d0', bg: '#f0fdf4', text: '#065f46' },
	};
	const s = tones[tone] || tones.primary;
	return (
		<span
			className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-semibold"
			style={{ borderColor: s.border, background: s.bg, color: s.text }}
		>
			{children}
		</span>
	);
}

/** Icon container */
function IconBox({ children, active = false, variant = 'primary', size = 'md' }) {
	const sizes = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-11 w-11' };
	let style = {};
	if (variant === 'secondary') style = { background: 'linear-gradient(135deg, var(--color-secondary-100), var(--color-primary-100))', color: 'var(--color-primary-700)' };
	else if (active) style = { background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))', color: 'white', boxShadow: '0 4px 14px -4px var(--color-primary-500)' };
	else style = { background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50))', color: 'var(--color-primary-600)' };
	return (
		<div className={cx('grid flex-shrink-0 place-items-center rounded-lg', sizes[size])} style={style}>
			{children}
		</div>
	);
}

/** Ghost (outlined) action button */
function GhostBtn({ children, onClick, disabled, title }) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={title}
			aria-label={title}
			className="inline-flex h-9 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-300)] hover:bg-[color:var(--color-primary-50)]"
			style={{
				borderColor: 'var(--color-primary-200)',
				background: 'white',
				color: 'var(--color-primary-700)',
				boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
			}}
		>
			{children}
		</button>
	);
}

/** Gradient (primary) action button */
function GradientBtn({ children, onClick, disabled, title }) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={title}
			aria-label={title}
			className="inline-flex h-9 items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-300)] hover:opacity-90 active:scale-[.97]"
			style={{
				background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
				boxShadow: '0 4px 14px -4px var(--color-primary-500)',
			}}
		>
			{children}
		</button>
	);
}

/** View action button for table rows */
function ViewBtn({ onClick, label }) {
	const [show, setShow] = useState(false);
	return (
		<div className="relative inline-block">
			<button
				type="button"
				onClick={onClick}
				onMouseEnter={() => setShow(true)}
				onMouseLeave={() => setShow(false)}
				className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--color-primary-200)] bg-white text-[color:var(--color-primary-600)] shadow-sm transition-all duration-150 hover:bg-[color:var(--color-primary-50)] hover:border-[color:var(--color-primary-300)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-300)]"
			>
				<Eye className="h-3.5 w-3.5" />
			</button>
			<div
				className={cx(
					'pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white transition-all duration-150',
					show ? 'opacity-100 -translate-y-0.5' : 'opacity-0 translate-y-1',
				)}
				style={{ background: '#0f172a', boxShadow: '0 8px 24px rgba(15,23,42,0.3)' }}
			>
				{label}
				<div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: '#0f172a', marginTop: '-1px' }} />
			</div>
		</div>
	);
}

/** Key-value row inside detail card */
function DataRow({ label, value }) {
	return (
		<div
			className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0"
			style={{ borderColor: 'var(--color-primary-50)' }}
		>
			<span className="text-xs font-medium text-slate-500">{label}</span>
			<span className="text-sm font-semibold text-slate-900">{value}</span>
		</div>
	);
}

/** Inline stat badge for column cells */
function StatBadge({ icon: Icon, value, secondary = false }) {
	return (
		<span
			className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold"
			style={{
				borderColor: 'var(--color-primary-200)',
				background: secondary
					? 'linear-gradient(135deg, white, var(--color-secondary-50))'
					: 'linear-gradient(135deg, white, var(--color-primary-50))',
				color: 'var(--color-primary-800)',
			}}
		>
			{Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0" />}
			{value}
		</span>
	);
}

/* ─────────────────────────────────────────────────────────────
	 API  (unchanged)
───────────────────────────────────────────────────────────── */
async function fetchReports({ page = 1, limit = 12, sortBy = 'created_at', sortOrder = 'DESC', filters = {} }) {
	const { data } = await api.get('/weekly-reports', {
		params: { page, limit, sortBy, sortOrder, filters },
		paramsSerializer: p => qs.stringify(p, { encode: true, arrayFormat: 'indices', skipNulls: true }),
	});
	return { items: data?.records || [], total: data?.total_records || 0, page: data?.current_page || page, limit: data?.per_page || limit };
}

async function fetchReportById(id) {
	const { data } = await api.get(`/weekly-reports/${id}`);
	return data;
}

async function saveCoachFeedback(id, payload) {
	const { data } = await api.put(`/weekly-reports/${id}/feedback`, payload);
	return data;
}

async function fetchAdminClients(adminId, { page = 1, limit = 20 }) {
	const { data } = await api.get(`/weekly-reports/admins/${adminId}/clients?limit=20000`, { params: { page, limit } });
	const uniqueRecords = Object.values(
		data.records.reduce((map, r) => {
			const key = `${r.userId}::${r.weekOf}`;
			const prev = map[key];
			if (!prev || new Date(r.updated_at) > new Date(prev.updated_at)) map[key] = r;
			return map;
		}, {}),
	);
	return { total_records: uniqueRecords.length, records: uniqueRecords };
}

async function fetchUserReports(userId, { page = 1, limit = 12, sortBy = 'created_at', sortOrder = 'DESC' }) {
	const { data } = await api.get(`/weekly-reports/users/${userId}/weekly-reports`, { params: { page, limit, sortBy, sortOrder } });
	return { items: data?.records || [], total: data?.total_records || 0, page: data?.current_page || page, limit: data?.per_page || limit };
}

async function fetchAdminUnreviewedCount() {
	const { data } = await api.get('/weekly-reports/admin/unreviewed/count');
	return data?.count ?? 0;
}

function yn(val, t) {
	if (val === 'yes') return t('reports.yes');
	if (val === 'no') return t('reports.no');
	return val ?? '—';
}

/* ─────────────────────────────────────────────────────────────
	 MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function ReportsUnifiedPage() {
	const t = useTranslations();
	const user = useUser();
	const isReady = !!user?.id;

	const [tab, setTab] = useState('all');
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(DEFAULT_LIMIT);
	const [sortBy, setSortBy] = useState('created_at');
	const [sortOrder, setSortOrder] = useState('DESC');
	const [reviewed, setReviewed] = useState('');

	const [loading, setLoading] = useState(false);
	const [err, setErr] = useState('');
	const [reports, setReports] = useState([]);
	const [total, setTotal] = useState(0);
	const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / (limit || 1))), [total, limit]);

	const [clients, setClients] = useState([]);
	const [clientsPage] = useState(1);
	const [selectedClientId, setSelectedClientId] = useState(null);
	const [clientsLoading, setClientsLoading] = useState(false);

	const [open, setOpen] = useState(false);
	const [detailLoading, setDetailLoading] = useState(false);
	const [activeId, setActiveId] = useState(null);
	const [active, setActive] = useState(null);

	const [saving, setSaving] = useState(false);
	const [saveErr, setSaveErr] = useState('');
	const [savedOk, setSavedOk] = useState(false);
	const [feedbackDraft, setFeedbackDraft] = useState('');

	const [unreviewedCount, setUnreviewedCount] = useState(0);
	const [countLoading, setCountLoading] = useState(false);

	const normalizedFilters = useMemo(() => {
		const f = {};
		if (!user?.id) return f;
		if (user?.role === 'admin') f.adminId = user.id;
		else f.coachId = user.id;
		if (tab === 'clients' && selectedClientId) f.userId = selectedClientId;
		if (reviewed === 'false') f.isRead = false;
		else if (reviewed === 'true') f.isRead = true;
		return f;
	}, [tab, user?.id, user?.role, selectedClientId, reviewed]);

	const loadReports = useCallback(async () => {
		if (!isReady) return;
		try {
			setErr('');
			setLoading(true);
			if (tab === 'clients' && selectedClientId) {
				const res = await fetchUserReports(selectedClientId, { page, limit, sortBy, sortOrder });
				setReports(res.items);
				setTotal(res.total);
			} else {
				const res = await fetchReports({ page, limit, sortBy, sortOrder, filters: normalizedFilters });
				setReports(res.items);
				setTotal(res.total);
			}
		} catch {
			setErr(t('reports.errors.load'));
		} finally {
			setLoading(false);
		}
	}, [isReady, tab, selectedClientId, page, limit, sortBy, sortOrder, normalizedFilters, t]);


	useEffect(() => { loadReports(); }, [loadReports]);
	useEffect(() => {
		setPage(1);
	}, [tab, selectedClientId, reviewed, sortBy, sortOrder, limit]);

	useEffect(() => {
		const go = async () => {
			if (!isReady || user?.role !== 'admin') return;
			try { setCountLoading(true); setUnreviewedCount(await fetchAdminUnreviewedCount()); }
			finally { setCountLoading(false); }
		};
		go();
	}, [isReady, user?.role]);

	useEffect(() => {
		const go = async () => {
			if (!isReady || tab !== 'clients') return;
			try {
				setClientsLoading(true);
				const data = await fetchAdminClients(user.id, { page: clientsPage, limit: 30 });
				setClients(data?.records || []);
			} finally { setClientsLoading(false); }
		};
		go();
	}, [isReady, tab, user?.id, clientsPage]);

	const openDetail = async id => {
		try {
			setActiveId(id); setDetailLoading(true); setOpen(true);
			const data = await fetchReportById(id);
			setActive(data || null);
			setFeedbackDraft(data?.coachFeedback || '');
		} catch { setActive(null); }
		finally { setDetailLoading(false); }
	};

	const closeDetail = () => {
		setOpen(false); setActiveId(null); setActive(null);
		setFeedbackDraft(''); setSaveErr(''); setSavedOk(false);
	};

	const handleSaveFeedback = async (opts = {}) => {
		if (!activeId) return;
		try {
			setSaving(true); setSaveErr('');
			const payload = { coachFeedback: typeof opts.feedback === 'string' ? opts.feedback : feedbackDraft };
			if (!payload.coachFeedback?.trim() && opts?.forceRequire) {
				setSaveErr(t('reports.errors.feedbackEmpty')); setSaving(false); return;
			}
			const saved = await saveCoachFeedback(activeId, payload);
			setActive(saved); setSavedOk(true);
			setTimeout(() => setSavedOk(false), 1600);
			await loadReports();
			if (user?.role === 'admin') {
				try { setUnreviewedCount(await fetchAdminUnreviewedCount()); } catch { /* ignore */ }
			}
		} catch { setSaveErr(t('reports.errors.save')); }
		finally { setSaving(false); }
	};

	const tabs = useMemo(() => [
		{ key: 'all', label: t('reports.tabs.allReports') },
		{ key: 'clients', label: t('reports.tabs.myClients') },
	], [t]);

	const clientOptions = useMemo(() => [
		{ id: '', label: t('reports.clients.select.placeholder') },
		...clients.map(c => ({ id: c.userId, label: c?.user?.name || c?.email || c.userId })),
	], [clients, t]);


	const reviewedOptions = useMemo(() => [
		{ id: '', label: t('reports.filters.reviewed.any') },
		{ id: 'true', label: t('reports.filters.reviewed.yes') },
		{ id: 'false', label: t('reports.filters.reviewed.no') },
	], [t]);

	const sortByOptions = useMemo(() => [
		{ id: 'created_at', label: t('reports.sort.fields.created_at') },
		{ id: 'updated_at', label: t('reports.sort.fields.updated_at') },
	], [t]);

	const sortOrderOptions = useMemo(() => [
		{ id: 'DESC', label: t('reports.sort.orders.desc') },
		{ id: 'ASC', label: t('reports.sort.orders.asc') },
	], [t]);

	const hasActiveFilters = useMemo(() => {
		return (
			reviewed !== '' ||
			sortBy !== 'created_at' ||
			sortOrder !== 'DESC' ||
			(tab === 'clients' && !!selectedClientId)
		);
	}, [reviewed, sortBy, sortOrder, tab, selectedClientId]);

	const tableFilters = (
		<>
			{tab === 'clients' && (
				<FilterField label={t('reports.clients.title')}>
					<Select
						searchable={false}
						clearable={false}
						placeholder={t('reports.clients.select.placeholder')}
						value={selectedClientId || ''}
						onChange={(val) => {
							setSelectedClientId(val || null);
							setPage(1);
						}}
						options={clientOptions}
					/>
				</FilterField>
			)}

			<FilterField label={t('reports.filters.reviewed.label')}>
				<Select
					searchable={false}
					clearable={false}
					value={reviewed}
					onChange={(val) => {
						setReviewed(val);
						setPage(1);
					}}
					options={reviewedOptions}
				/>
			</FilterField>

			<FilterField label={t('reports.filters.sortBy')}>
				<Select
					searchable={false}
					clearable={false}
					value={sortBy}
					onChange={(val) => {
						setSortBy(val);
						setPage(1);
					}}
					options={sortByOptions}
				/>
			</FilterField>

			<FilterField label={t('reports.filters.sortOrder')}>
				<Select
					searchable={false}
					clearable={false}
					value={sortOrder}
					onChange={(val) => {
						setSortOrder(val);
						setPage(1);
					}}
					options={sortOrderOptions}
				/>
			</FilterField>
		</>
	);



	const headerStats = useMemo(() => {
		const reviewedCount = reports.filter(r => !!r?.reviewedAt).length;
		return { reviewedCount, awaitingCount: reports.length - reviewedCount };
	}, [reports]);

	/* ── Columns ── */
	const columns = useMemo(() => [
		{
			header: t('reports.columns.athlete'),
			accessor: '__user',
			cell: row => {
				const u = row?.user || {};
				const isReviewed = !!row?.reviewedAt;
				return (
					<div className="flex min-w-[240px] items-center gap-3">
						<IconBox size="md">
							<User2 className="h-4.5 w-4.5" />
						</IconBox>
						<p dir='auto' className="max-w-[360px] truncate text-sm font-semibold text-slate-900">
							{u?.name || u?.email || t('reports.athlete')}
						</p>
					</div>
				);
			},
		},
		{
			header: t('reports.createdAt'),
			accessor: '__weight',
			cell: row => {
				const u = row?.user || {};
				const isReviewed = !!row?.reviewedAt;

				return <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
					<span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
						<CalendarDays className="h-3 w-3" />
						{row?.weekOf || '—'}
					</span>
				</div>
			},
		},
		{
			header: t('reports.statusReview'),
			accessor: '__weight',
			cell: row => {
				const u = row?.user || {};
				const isReviewed = !!row?.reviewedAt;

				return <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
					{isReviewed
						? <Pill tone="ok"><CheckCircle2 className="h-3 w-3" />{t('reports.reviewed')}</Pill>
						: <Pill tone="warn"><XCircle className="h-3 w-3" />{t('reports.awaitingReview')}</Pill>}
				</div>
			},
		},
		{
			header: t('reports.card.weight'),
			accessor: '__weight',
			cell: row => {
				const w = row?.measurements?.weight;
				return <StatBadge icon={HeartPulse} value={w != null ? `${w} ${t('reports.card.kg')}` : '—'} />;
			},
		},
		{
			header: t('reports.card.cardio'),
			accessor: '__cardio',
			cell: row => {
				const c = row?.training?.cardioAdherence;
				return <StatBadge icon={Activity} value={c != null ? `${c} / 5` : '—'} secondary />;
			},
		}, 
		{
			header: t('reports.view'),
			accessor: '__actions',
			className: 'text-right',
			cell: row => (
				<div className="flex justify-start">
					<ActionButtons
						row={row}
						gap="gap-1"
						actions={[
							{
								icon: <Eye className="h-3.5 w-3.5" />,
								tooltip: t('reports.view'),
								variant: 'blue',
								size: 'md',
								hidden: !row?.id,
								onClick: r => openDetail(r.id),
							},
						]}
					/>
				</div>
			),
		}
	], [t]);

	/* ─────────────────────────────────────────────────────────────
		 RENDER
	───────────────────────────────────────────────────────────── */
	return (
		<div className="space-y-6 pb-20">

			{/* ── Header ── */}
			<GradientStatsHeader
				title={t('reports.title')}
				desc={t('reports.subtitle')}
				icon={Sparkles}
				btnName={t('reports.detail.feedback')}
				onClick={() => { }}
			>
				<StatCard icon={FileText} title={t('reports.labels.total', { default: t('reports.total', { default: 'Total' }) })} value={total || 0} />
				<StatCard icon={CheckCircle2} title={t('reports.reviewed')} value={headerStats.reviewedCount} />
				<StatCard icon={XCircle} title={t('reports.awaitingReview')} value={headerStats.awaitingCount} />
			</GradientStatsHeader>



			{/* ── Table ── */}
			<DataTable
				columns={columns}
				data={reports}
				isLoading={loading}
				rowKey={(row) => row.id}
				searchValue=""
				onSearchChange={() => { }}
				onSearch={() => { }}
				filters={tableFilters}
				hasActiveFilters={hasActiveFilters}
				onApplyFilters={() => {
					setPage(1);
					loadReports();
				}}
				labels={{
					searchPlaceholder: t('reports.searchPlaceholder', { default: 'Search is not available here' }),
					filter: t('reports.filters.title', { default: 'Filters' }),
					apply: t('reports.filters.apply', { default: 'Apply' }),
					emptyTitle: err || t('reports.empty'),
					emptySubtitle: t('reports.subtitle'),
					preview: t('reports.detail.title'),
				}}
				pagination={{
					current_page: page,
					per_page: limit,
					total_records: total,
				}}
				onPageChange={({ page: nextPage, per_page }) => {
					setPage(nextPage);
					if (per_page !== limit) {
						setLimit(per_page);
					}
				}}
				perPageOptions={PER_PAGE_OPTIONS}
				striped
				hoverable
				className="w-full"
			/>

			{/* ═══════════════════════════════════════════════
          DETAIL MODAL
      ═══════════════════════════════════════════════ */}
			<Modal
				open={open}
				onClose={closeDetail}
				title={t('reports.detail.title')}
				maxW="max-w-5xl"
				maxH="max-h-[100vh]"
				maxHBody="max-h-[60vh]"
			>
				{detailLoading ? (
					<div className="flex h-52 flex-col items-center justify-center gap-2">
						<Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--color-primary-500)' }} />
						<p className="text-sm text-slate-400">{t('reports.detail.loading')}</p>
					</div>
				) : !active ? (
					<p className="text-sm text-slate-500">{t('reports.empty')}</p>
				) : (
					<div className="space-y-4 pt-1">

						{/* ── Athlete summary ── */}
						<Card className="p-4">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="flex items-center gap-3">
									<IconBox active size="md">
										<User2 className="h-5 w-5" />
									</IconBox>
									<div>
										<p className="text-sm font-bold text-slate-900">{active?.user?.name || active?.user?.email}</p>
										<div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
											<span className="inline-flex items-center gap-1">
												<CalendarDays className="h-3 w-3" />
												{t('reports.columns.weekOf')}: {active?.weekOf}
											</span>
											<span className="hidden sm:inline">·</span>
											<span className="font-en">{active?.created_at ? new Date(active.created_at).toLocaleString() : '—'}</span>
										</div>
									</div>
								</div>

								{active?.reviewedAt
									? <Pill tone="ok"><CheckCircle2 className="h-3 w-3" />{t('reports.reviewed')}</Pill>
									: <Pill tone="warn"><XCircle className="h-3 w-3" />{t('reports.awaitingReview')}</Pill>}
							</div>
						</Card>

						{/* ── Progress photos ── */}
						<Card className="p-4">
							<div className="mb-3 flex items-center justify-between gap-2">
								<p className="text-sm font-bold text-slate-900">{t('reports.detail.photos')}</p>
								<Pill tone="soft">{t('reports.columns.weekOf')}: {active?.weekOf || '—'}</Pill>
							</div>

							<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
								{['front', 'back', 'left', 'right'].map(side => {
									const url = active?.photos?.[side]?.url;
									return (
										<div
											key={side}
											className="overflow-hidden rounded-lg border transition-colors hover:border-[color:var(--color-primary-200)]"
											style={{ borderColor: 'var(--color-primary-100)', background: 'var(--color-primary-50)' }}
										>
											<div className="border-b border-[color:var(--color-primary-100)] bg-white px-3 py-1.5">
												<p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
													{t(`reports.detail.section.photos.${side}`)}
												</p>
											</div>
											{url ? (
												<Img src={url} alt={side} className="h-40 w-full object-contain bg-white" />
											) : (
												<div className="flex h-40 items-center justify-center bg-white text-xs text-slate-300">
													{t('reports.detail.noPhoto')}
												</div>
											)}
										</div>
									);
								})}
							</div>
						</Card>

						{/* ── Measurements ── */}
						<Card className="p-4">
							<div className="mb-3 flex items-center justify-between gap-2">
								<p className="text-sm font-bold text-slate-900">{t('reports.detail.measurements')}</p>
								<Pill tone="primary">{active?.measurements?.date || '—'}</Pill>
							</div>

							<div className="overflow-auto rounded-lg border border-[color:var(--color-primary-100)]">
								<table className="min-w-[600px] w-full text-sm">
									<thead>
										<tr style={{ background: 'var(--color-primary-50)' }}>
											{['date', 'weight', 'waist', 'chest', 'hips', 'arms', 'thighs'].map(k => (
												<th key={k} className="px-3 py-2.5 text-start text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
													{t(`reports.detail.section.measurements.${k}`)}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										<tr className="border-t border-[color:var(--color-primary-50)]">
											{[
												active?.measurements?.date,
												active?.measurements?.weight,
												active?.measurements?.waist,
												active?.measurements?.chest,
												active?.measurements?.hips,
												active?.measurements?.arms,
												active?.measurements?.thighs,
											].map((v, i) => (
												<td key={i} className="px-3 py-2.5 text-sm font-medium text-slate-800">{v ?? '—'}</td>
											))}
										</tr>
									</tbody>
								</table>
							</div>
						</Card>

						{/* ── Training & Diet ── */}
						<div className="grid gap-4 md:grid-cols-2">
							{/* Training */}
							<Card className="p-4">
								<p className="mb-3 text-sm font-bold text-slate-900">{t('reports.detail.training')}</p>
								<div className="space-y-0">
									<DataRow label={t('reports.detail.section.training.cardioAdherence')} value={`${active?.training?.cardioAdherence ?? '—'} / 5`} />
									<DataRow label={t('reports.detail.section.training.intensityOk')} value={yn(active?.training?.intensityOk, t)} />
									<DataRow label={t('reports.detail.section.training.shape')} value={yn(active?.training?.shapeChange, t)} />
									<DataRow label={t('reports.detail.section.training.fitness')} value={yn(active?.training?.fitnessChange, t)} />
									<DataRow label={t('reports.detail.section.training.sleepEnough')} value={yn(active?.training?.sleep?.enough, t)} />
									<DataRow label={t('reports.detail.section.training.sleepHours')} value={active?.training?.sleep?.hours || '—'} />
								</div>

								{active?.training?.programNotes && (
									<div className="mt-3">
										<p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
											{t('reports.detail.section.training.notes.title')}
										</p>
										<div
											className="rounded-lg border p-3 text-sm whitespace-pre-wrap text-slate-800"
											style={{ borderColor: 'var(--color-primary-100)', background: 'var(--color-primary-50)' }}
										>
											{active.training.programNotes}
										</div>
									</div>
								)}

								{(active?.training?.daysDeviation?.count || active?.training?.daysDeviation?.reason) && (
									<div className="mt-3 space-y-0">
										<p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
											{t('reports.detail.section.training.daysDeviation')}
										</p>
										<DataRow label={t('reports.detail.section.training.deviation.count')} value={active?.training?.daysDeviation?.count || '—'} />
										<DataRow label={t('reports.detail.section.training.deviation.reason')} value={active?.training?.daysDeviation?.reason || '—'} />
									</div>
								)}
							</Card>

							{/* Diet */}
							<Card className="p-4">
								<p className="mb-3 text-sm font-bold text-slate-900">{t('reports.detail.diet')}</p>
								<div className="space-y-0">
									<DataRow label={t('reports.detail.section.diet.hungry')} value={yn(active?.diet?.hungry, t)} />
									<DataRow label={t('reports.detail.section.diet.comfort')} value={yn(active?.diet?.mentalComfort, t)} />
									<DataRow label={t('reports.detail.section.diet.tooMuch')} value={yn(active?.diet?.foodTooMuch, t)} />
									<DataRow label={t('reports.detail.section.diet.wantSpecific')} value={active?.diet?.wantSpecific || '—'} />
								</div>

								{(active?.diet?.dietDeviation?.times || active?.diet?.dietDeviation?.details) && (
									<div className="mt-3 space-y-0">
										<p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
											{t('reports.detail.section.diet.deviation.title')}
										</p>
										<DataRow label={t('reports.detail.section.diet.deviation.times')} value={active?.diet?.dietDeviation?.times || '—'} />
										<DataRow label={t('reports.detail.section.diet.deviation.details')} value={active?.diet?.dietDeviation?.details || '—'} />
									</div>
								)}
							</Card>
						</div>

						{/* ── Coach Feedback ── */}
						<Card className="p-4">
							<div className="mb-3 flex items-center justify-between gap-2">
								<div className="flex items-center gap-2.5">
									<IconBox variant="secondary" size="sm">
										<MessageSquareText className="h-4 w-4" />
									</IconBox>
									<p className="text-sm font-bold text-slate-900">{t('reports.detail.feedback')}</p>
								</div>

								{savedOk && (
									<Pill tone="ok">
										<CheckCircle2 className="h-3 w-3" />
										{t('reports.messages.saved')}
									</Pill>
								)}
							</div>

							<textarea
								className="min-h-[120px] w-full rounded-lg border bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary-300)]"
								style={{ borderColor: 'var(--color-primary-200)' }}
								placeholder={t('reports.detail.feedbackPh')}
								value={feedbackDraft}
								onChange={e => setFeedbackDraft(e.target.value)}
							/>

							{saveErr && <p className="mt-2 text-sm text-rose-600">{saveErr}</p>}

							<div className="mt-3 flex items-center justify-end gap-2">
								<GhostBtn title={t('reports.detail.title')} onClick={closeDetail}>
									{t('reports.close', { default: 'Close' })}
								</GhostBtn>
								<GradientBtn
									title={t('reports.reviewed')}
									disabled={saving}
									onClick={() => handleSaveFeedback({ feedback: feedbackDraft || '' })}
								>
									{saving
										? <Loader2 className="h-4 w-4 animate-spin" />
										: <CheckCircle2 className="h-4 w-4" />}
									{t('reports.reviewed')}
								</GradientBtn>
							</div>
						</Card>

					</div>
				)}
			</Modal>
		</div>
	);
}