

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

// ✅ DataTable + PrettyPagination like submissions page
import DataTable from '@/components/dashboard/ui/DataTable';

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

/* ----------------------------- constants ----------------------------- */
const PAGE_SIZE = 12;
const cx = (...c) => c.filter(Boolean).join(' ');

/* ---------------- Theme helpers (same as other page) ---------------- */
function ThemeFrame({ children, className = '' }) {
	return (
		<div className={cx('rounded-lg p-[1px]', className)}>
			<div
				className="rounded-lg border bg-white/85 backdrop-blur-xl"
				style={{
					borderColor: 'var(--color-primary-200)',
					boxShadow: '0 1px 0 rgba(15, 23, 42, 0.04), 0 18px 40px rgba(15, 23, 42, 0.10)',
				}}
			>
				{children}
			</div>
		</div>
	);
}

function SoftCard({ children, className = '' }) {
	return (
		<div
			className={cx('rounded-lg border bg-white', className)}
			style={{
				borderColor: 'var(--color-primary-200)',
				boxShadow: '0 1px 0 rgba(15, 23, 42, 0.03), 0 10px 24px rgba(15, 23, 42, 0.06)',
			}}
		>
			{children}
		</div>
	);
}

function Pill({ children, tone = 'primary' }) {
	const tones = {
		primary: {
			border: 'var(--color-primary-200)',
			bg: 'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.9))',
			text: 'var(--color-primary-800)',
		},
		soft: {
			border: '#e2e8f0',
			bg: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
			text: '#475569',
		},
		warn: {
			border: 'rgba(251,191,36,0.5)',
			bg: 'linear-gradient(135deg, rgba(255,251,235,0.95), rgba(255,255,255,0.9))',
			text: '#92400e',
		},
		ok: {
			border: 'rgba(52,211,153,0.35)',
			bg: 'linear-gradient(135deg, rgba(236,253,245,0.95), rgba(255,255,255,0.9))',
			text: '#065f46',
		},
	};
	const s = tones[tone] || tones.primary;

	return (
		<span
			className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
			style={{
				borderColor: s.border,
				background: s.bg,
				color: s.text,
				boxShadow: '0 6px 16px rgba(15,23,42,0.06)',
			}}
		>
			{children}
		</span>
	);
}

function GhostBtn({ children, onClick, disabled, title }) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={title}
			aria-label={title}
			className="inline-flex items-center gap-2 h-11 px-4 rounded-lg border transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 disabled:opacity-60 disabled:cursor-not-allowed"
			style={{
				borderColor: 'var(--color-primary-200)',
				backgroundColor: 'rgba(255,255,255,0.9)',
				color: 'var(--color-primary-800)',
				boxShadow: '0 12px 24px rgba(15,23,42,0.08)',
				['--tw-ring-color']: 'var(--color-primary-200)',
			}}
			onMouseEnter={e => {
				if (!disabled) e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
			}}
			onMouseLeave={e => {
				if (!disabled) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.9)';
			}}
		>
			{children}
		</button>
	);
}

function GradientBtn({ children, onClick, disabled, title }) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={title}
			aria-label={title}
			className="inline-flex items-center gap-2 h-11 px-5 rounded-lg border transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 disabled:opacity-60 disabled:cursor-not-allowed"
			style={{
				borderColor: 'transparent',
				background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
				color: 'white',
				boxShadow: '0 18px 34px rgba(15,23,42,0.14)',
				['--tw-ring-color']: 'var(--color-primary-200)',
			}}
		>
			{children}
		</button>
	);
}

/* ----------------------------- API calls ----------------------------- */
async function fetchReports({ page = 1, limit = 12, sortBy = 'created_at', sortOrder = 'DESC', filters = {} }) {
	const params = { page, limit, sortBy, sortOrder, filters };
	const { data } = await api.get('/weekly-reports', {
		params,
		paramsSerializer: p => qs.stringify(p, { encode: true, arrayFormat: 'indices', skipNulls: true }),
	});

	return {
		items: data?.records || [],
		total: data?.total_records || 0,
		page: data?.current_page || page,
		limit: data?.per_page || limit,
	};
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
	const { data } = await api.get(`/weekly-reports/admins/${adminId}/clients?limit=20000`, {
		params: { page, limit },
	});

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
	const { data } = await api.get(`/weekly-reports/users/${userId}/weekly-reports`, {
		params: { page, limit, sortBy, sortOrder },
	});
	return {
		items: data?.records || [],
		total: data?.total_records || 0,
		page: data?.current_page || page,
		limit: data?.per_page || limit,
	};
}

async function fetchAdminUnreviewedCount() {
	const { data } = await api.get('/weekly-reports/admin/unreviewed/count');
	return data?.count ?? 0;
}

/* ---------------------------------- Page ---------------------------------- */
export default function ReportsUnifiedPage() {
	const t = useTranslations(); // ✅ keep your existing keys: t('reports.xxx')
	const user = useUser();
	const isReady = !!user?.id;

	const [tab, setTab] = useState('all'); // 'all' | 'clients'

	const [page, setPage] = useState(1);
	const [limit] = useState(PAGE_SIZE);
	const [sortBy, setSortBy] = useState('created_at');
	const [sortOrder, setSortOrder] = useState('DESC');
	const [reviewed, setReviewed] = useState('');

	const [loading, setLoading] = useState(false);
	const [err, setErr] = useState('');
	const [reports, setReports] = useState([]);
	const [total, setTotal] = useState(0);
	const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / (limit || 1))), [total, limit]);

	const [clients, setClients] = useState([]);
	const [clientsPage, setClientsPage] = useState(1);
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

	useEffect(() => {
		loadReports();
	}, [loadReports]);

	// ✅ Unreviewed count for admin
	useEffect(() => {
		const go = async () => {
			if (!isReady || user?.role !== 'admin') return;
			try {
				setCountLoading(true);
				const count = await fetchAdminUnreviewedCount();
				setUnreviewedCount(count);
			} finally {
				setCountLoading(false);
			}
		};
		go();
	}, [isReady, user?.role]);

	// load clients for admin when in clients tab
	useEffect(() => {
		const go = async () => {
			if (!isReady || tab !== 'clients') return;
			try {
				setClientsLoading(true);
				const data = await fetchAdminClients(user.id, { page: clientsPage, limit: 30 });
				setClients(data?.records || []);
			} finally {
				setClientsLoading(false);
			}
		};
		go();
	}, [isReady, tab, user?.id, clientsPage]);

	const openDetail = async id => {
		try {
			setActiveId(id);
			setDetailLoading(true);
			setOpen(true);
			const data = await fetchReportById(id);
			setActive(data || null);
			setFeedbackDraft(data?.coachFeedback || '');
		} catch {
			setActive(null);
		} finally {
			setDetailLoading(false);
		}
	};

	const closeDetail = () => {
		setOpen(false);
		setActiveId(null);
		setActive(null);
		setFeedbackDraft('');
		setSaveErr('');
		setSavedOk(false);
	};

	// ✅ save without isRead, refresh list + count
	const handleSaveFeedback = async (opts = {}) => {
		if (!activeId) return;
		try {
			setSaving(true);
			setSaveErr('');
			const payload = { coachFeedback: typeof opts.feedback === 'string' ? opts.feedback : feedbackDraft };

			if (!payload.coachFeedback?.trim() && opts?.forceRequire) {
				setSaveErr(t('reports.errors.feedbackEmpty'));
				setSaving(false);
				return;
			}

			const saved = await saveCoachFeedback(activeId, payload);
			setActive(saved);
			setSavedOk(true);
			setTimeout(() => setSavedOk(false), 1600);

			await loadReports();

			if (user?.role === 'admin') {
				try {
					const c = await fetchAdminUnreviewedCount();
					setUnreviewedCount(c);
				} catch {
					// ignore
				}
			}
		} catch {
			setSaveErr(t('reports.errors.save'));
		} finally {
			setSaving(false);
		}
	};

	const tabs = useMemo(
		() => [
			{ key: 'all', label: t('reports.tabs.allReports') },
			{ key: 'clients', label: t('reports.tabs.myClients') },
		],
		[t],
	);

	const clientOptions = useMemo(
		() => [
			{ id: '', label: t('reports.clients.select.placeholder') },
			...clients.map(c => ({
				id: c.userId,
				label: c?.user?.name || c?.email || c.userId,
			})),
		],
		[clients, t],
	);

	const headerStats = useMemo(() => {
		const reviewedCount = reports.filter(r => !!r?.reviewedAt).length;
		const awaitingCount = reports.length - reviewedCount;
		return { reviewedCount, awaitingCount };
	}, [reports]);

	/* ---------------------------- DataTable columns ---------------------------- */
	const columns = useMemo(
		() => [
			{
				header: t('reports.columns.athlete'),
				accessor: '__user',
				cell: row => {
					const u = row?.user || {};
					const statusReviewed = !!row?.reviewedAt;

					return (
						<div className="flex items-center gap-3 min-w-[260px]">
							<div
								className="grid place-items-center rounded-lg"
								style={{
									width: 44,
									height: 44,
									background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-200))',
									boxShadow: '0 12px 20px rgba(15,23,42,0.08)',
								}}
							>
								<User2 className="w-5 h-5" style={{ color: 'var(--color-primary-800)' }} />
							</div>

							<div className="min-w-0">
								<div className="font-extrabold text-slate-900 truncate max-w-[420px]">
									{u?.name || u?.email || t('reports.athlete')}
								</div>

								<div className="mt-0.5 text-xs text-slate-500 flex items-center gap-2">
									<span className="inline-flex items-center gap-1">
										<CalendarDays className="w-3.5 h-3.5" />
										{t('reports.columns.weekOf')}: {row?.weekOf || '—'}
									</span>
									<span className="hidden sm:inline">•</span>
									{statusReviewed ? (
										<Pill tone="ok">{t('reports.reviewed')}</Pill>
									) : (
										<Pill tone="warn">{t('reports.awaitingReview')}</Pill>
									)}
								</div>
							</div>
						</div>
					);
				},
			},
			{
				header: t('reports.card.weight'),
				accessor: '__weight',
				cell: row => {
					const w = row?.measurements?.weight;
					return (
						<span
							className="inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold"
							style={{
								borderColor: 'var(--color-primary-200)',
								background: 'linear-gradient(135deg, rgba(255,255,255,0.92), var(--color-primary-50))',
								color: 'var(--color-primary-800)',
							}}
						>
							<HeartPulse className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1" />
							{w != null ? `${w} ${t('reports.card.kg')}` : '—'}
						</span>
					);
				},
			},
			{
				header: t('reports.card.cardio'),
				accessor: '__cardio',
				cell: row => {
					const c = row?.training?.cardioAdherence;
					return (
						<span
							className="inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold"
							style={{
								borderColor: 'var(--color-primary-200)',
								background: 'linear-gradient(135deg, rgba(255,255,255,0.92), var(--color-secondary-50))',
								color: 'var(--color-primary-800)',
							}}
						>
							<Activity className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1" />
							{c != null ? `${c} / 5` : '—'}
						</span>
					);
				},
			},
			{
				header: t('reports.createdAt'),
				accessor: 'created_at',
				className: 'font-en',
				cell: row => (
					<span className="text-sm text-slate-700 font-en">
						{row?.created_at ? new Date(row.created_at).toLocaleString() : '—'}
					</span>
				),
			},
			{
				header: t('reports.view'),
				accessor: '__actions',
				className: 'text-right',
				cell: row => (
					<div className="flex justify-start">
						<GhostBtn title={t('reports.view')} onClick={() => openDetail(row.id)}>
							<Eye className="w-4 h-4" />
							<span className="text-sm font-semibold">{t('reports.view')}</span>
						</GhostBtn>
					</div>
				),
			},
		],
		[t],
	);

	/* ---------------------------- header stats cards ---------------------------- */
	const title = t('reports.title');
	const desc = t('reports.subtitle');

	return (
		<div className="space-y-6">
			{/* ✅ THEMED HEADER (same pattern as other page) */}
			<GradientStatsHeader
				title={title}
				desc={desc}
				icon={Sparkles}
				btnName={t('reports.detail.feedback')}
				onClick={() => {
					// just focus section; you can replace with any action you want
					// (kept minimal to avoid changing behavior)
				}}
			>
				<StatCard icon={FileText} title={t('reports.labels.total', { default: t('reports.total', { default: 'Total' }) })} value={total || 0} />
				<StatCard icon={CheckCircle2} title={t('reports.reviewed')} value={headerStats.reviewedCount} />
				<StatCard icon={XCircle} title={t('reports.awaitingReview')} value={headerStats.awaitingCount} />
			</GradientStatsHeader>

			{/* ✅ Filters bar (theme-aware) */}
			<ThemeFrame>
				<div className="p-4 sm:p-5">
					<div className="flex items-center justify-between gap-3 flex-wrap">
						<div className="flex-1 min-w-[260px]">
							{user?.role === 'admin' && (
								<TabsPill
									tabs={tabs}
									active={tab}
									sliceInPhone={false}
									onChange={key => {
										setTab(key);
										setPage(1);
										if (key === 'all') setSelectedClientId(null);
									}}
									outerCn="!max-w-fit !w-fit"
								/>
							)}
						</div>

						{user?.role === 'admin' && (
							<div className={cx('flex items-center gap-2', unreviewedCount === 0 && 'opacity-60')}>
								<Pill tone="warn">
									<ClipboardList className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1" />
									{countLoading ? t('reports.loading') : t('reports.unreviewedBadge', { count: unreviewedCount })}
								</Pill>
							</div>
						)}
					</div>

					<div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
						{tab === 'clients' && (
							<div className="sm:col-span-1">
								{clientsLoading ? (
									<div className="h-[56px] grid place-content-center text-slate-600">
										<Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" />
										<div className="text-xs">{t('reports.loading')}</div>
									</div>
								) : clients.length === 0 ? (
									<div className="h-[56px] grid place-content-center text-slate-600 text-sm">
										{t('reports.clients.empty')}
									</div>
								) : (
									<Select
										label={t('reports.clients.title')}
										placeholder={t('reports.clients.select.placeholder')}
										value={selectedClientId || ''}
										onChange={val => {
											setSelectedClientId(val || null);
											setPage(1);
										}}
										options={clientOptions}
										clearable={false}
										searchable={false}
										className="max-w-md"
									/>
								)}
							</div>
						)}

						<Select
							label={t('reports.filters.reviewed.label')}
							clearable={false}
							searchable={false}
							value={reviewed}
							onChange={val => {
								setReviewed(val);
								setPage(1);
							}}
							options={[
								{ id: '', label: t('reports.filters.reviewed.any') },
								{ id: 'true', label: t('reports.filters.reviewed.yes') },
								{ id: 'false', label: t('reports.filters.reviewed.no') },
							]}
						/>

						<Select
							label={t('reports.filters.sortBy')}
							value={sortBy}
							clearable={false}
							searchable={false}
							onChange={val => {
								setSortBy(val);
								setPage(1);
							}}
							options={[
								{ id: 'created_at', label: t('reports.sort.fields.created_at') },
								{ id: 'updated_at', label: t('reports.sort.fields.updated_at') },
							]}
						/>

						<Select
							label={t('reports.filters.sortOrder')}
							value={sortOrder}
							clearable={false}
							searchable={false}
							onChange={val => {
								setSortOrder(val);
								setPage(1);
							}}
							options={[
								{ id: 'DESC', label: t('reports.sort.orders.desc') },
								{ id: 'ASC', label: t('reports.sort.orders.asc') },
							]}
						/>
					</div>
				</div>
			</ThemeFrame>

			{/* ✅ Table (replaces the ugly cards grid) */}
			<ThemeFrame>
				<DataTable
					columns={columns}
					data={reports}
					loading={loading}
					itemsPerPage={PAGE_SIZE}
					serverPagination={true}
					stickyHeader={true}
					selectable={false}
					pagination
					page={page}
					onPageChange={p => setPage(p)}
					totalRows={totalPages}
					emptyState={
						<div className="text-center py-12">
							<div
								className="mx-auto mb-4 grid place-items-center rounded-lg"
								style={{
									width: 72,
									height: 72,
									background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-secondary-100))',
									boxShadow: '0 18px 36px rgba(15,23,42,0.12)',
								}}
							>
								<FileText className="w-8 h-8" style={{ color: 'var(--color-primary-700)' }} />
							</div>
							<h3 className="text-lg font-extrabold text-slate-900 mb-1">
								{err ? err : t('reports.empty')}
							</h3>
							<p className="text-slate-600">
								{t('reports.subtitle')}
							</p>
						</div>
					}
				/>

			</ThemeFrame>

			{/* ✅ Detail Modal (theme-aware redesign) */}
			<Modal open={open} onClose={closeDetail} title={t('reports.detail.title')} maxW="max-w-5xl" maxH="max-h-[100vh]" maxHBody="max-h-[60vh]">
				{detailLoading ? (
					<div className="h-52 grid place-content-center text-slate-600">
						<Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
						<div className="text-sm">{t('reports.detail.loading')}</div>
					</div>
				) : !active ? (
					<div className="text-sm text-slate-600">{t('reports.empty')}</div>
				) : (
					<div className="space-y-4 pt-1">
						{/* Header */}
						<SoftCard className="p-4">
							<div className="flex items-start justify-between gap-3 flex-wrap">
								<div className="flex items-center gap-3">
									<div
										className="grid place-items-center rounded-lg"
										style={{
											width: 44,
											height: 44,
											background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-200))',
										}}
									>
										<User2 className="w-5 h-5" style={{ color: 'var(--color-primary-800)' }} />
									</div>

									<div className="min-w-0">
										<div className="text-sm font-extrabold text-slate-900 truncate">
											{active?.user?.name || active?.user?.email}
										</div>
										<div className="text-xs text-slate-500 flex items-center gap-2">
											<span className="inline-flex items-center gap-1">
												<CalendarDays className="w-3.5 h-3.5" />
												{t('reports.columns.weekOf')}: {active?.weekOf}
											</span>
											<span className="hidden sm:inline">•</span>
											<span className="font-en">{active?.created_at ? new Date(active.created_at).toLocaleString() : '—'}</span>
										</div>
									</div>
								</div>

								<div className="flex items-center gap-2">
									{active?.reviewedAt ? (
										<Pill tone="ok">
											<CheckCircle2 className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1" />
											{t('reports.reviewed')}
										</Pill>
									) : (
										<Pill tone="warn">
											<XCircle className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1" />
											{t('reports.awaitingReview')}
										</Pill>
									)}
								</div>
							</div>
						</SoftCard>

						{/* Photos */}
						<SoftCard className="p-4">
							<div className="flex items-center justify-between gap-2 mb-3">
								<div className="font-extrabold text-slate-900 text-sm">{t('reports.detail.photos')}</div>
								<Pill tone="soft">{t('reports.columns.weekOf')}: {active?.weekOf || '—'}</Pill>
							</div>

							<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
								{['front', 'back', 'left', 'right'].map(side => {
									const url = active?.photos?.[side]?.url;
									return (
										<div
											key={side}
											className="rounded-lg border p-2"
											style={{
												borderColor: 'var(--color-primary-200)',
												background: 'linear-gradient(135deg, rgba(255,255,255,0.96), var(--color-primary-50))',
											}}
										>
											<div className="text-[11px] font-semibold text-slate-600 mb-1">
												{t(`reports.detail.section.photos.${side}`)}
											</div>
											{url ? (
												<Img src={url} alt={side} className="h-40 w-full object-contain rounded-lg bg-white" />
											) : (
												<div
													className="h-40 grid place-content-center rounded-lg bg-white text-slate-400 text-xs border"
													style={{ borderColor: 'rgba(226,232,240,0.9)' }}
												>
													{t('reports.detail.noPhoto')}
												</div>
											)}
										</div>
									);
								})}
							</div>
						</SoftCard>

						{/* Measurements */}
						<SoftCard className="p-4">
							<div className="flex items-center justify-between gap-2 mb-3">
								<div className="font-extrabold text-slate-900 text-sm">{t('reports.detail.measurements')}</div>
								<Pill tone="primary">{active?.measurements?.date || '—'}</Pill>
							</div>

							<div className="overflow-auto">
								<table className="min-w-[620px] w-full text-sm">
									<thead className="text-xs text-slate-500">
										<tr>
											{[
												'date',
												'weight',
												'waist',
												'chest',
												'hips',
												'arms',
												'thighs',
											].map(k => (
												<th key={k} className="text-start py-2 px-2 whitespace-nowrap">
													{t(`reports.detail.section.measurements.${k}`)}
												</th>
											))}
										</tr>
									</thead>
									<tbody className="text-slate-800">
										<tr className="border-t" style={{ borderColor: 'rgba(241,245,249,1)' }}>
											<td className="py-2 px-2">{active?.measurements?.date || '—'}</td>
											<td className="py-2 px-2">{active?.measurements?.weight ?? '—'}</td>
											<td className="py-2 px-2">{active?.measurements?.waist ?? '—'}</td>
											<td className="py-2 px-2">{active?.measurements?.chest ?? '—'}</td>
											<td className="py-2 px-2">{active?.measurements?.hips ?? '—'}</td>
											<td className="py-2 px-2">{active?.measurements?.arms ?? '—'}</td>
											<td className="py-2 px-2">{active?.measurements?.thighs ?? '—'}</td>
										</tr>
									</tbody>
								</table>
							</div>
						</SoftCard>

						{/* Training & Diet */}
						<div className="grid md:grid-cols-2 gap-3">
							<SoftCard className="p-4">
								<div className="font-extrabold text-slate-900 text-sm mb-3">{t('reports.detail.training')}</div>
								<div className="space-y-1.5 text-sm">
									<Row label={t('reports.detail.section.training.cardioAdherence')} value={(active?.training?.cardioAdherence ?? '—') + ' / 5'} />
									<Row label={t('reports.detail.section.training.intensityOk')} value={yn(active?.training?.intensityOk, t)} />
									<Row label={t('reports.detail.section.training.shape')} value={yn(active?.training?.shapeChange, t)} />
									<Row label={t('reports.detail.section.training.fitness')} value={yn(active?.training?.fitnessChange, t)} />
									<Row label={t('reports.detail.section.training.sleepEnough')} value={yn(active?.training?.sleep?.enough, t)} />
									<Row label={t('reports.detail.section.training.sleepHours')} value={active?.training?.sleep?.hours || '—'} />

									<div className="pt-2">
										<div className="text-xs text-slate-500 mb-1">{t('reports.detail.section.training.notes.title')}</div>
										<div
											className="rounded-lg border p-3 text-slate-800 text-sm whitespace-pre-wrap"
											style={{
												borderColor: 'rgba(226,232,240,0.9)',
												background: 'linear-gradient(135deg, #f8fafc, #ffffff)',
											}}
										>
											{active?.training?.programNotes || '—'}
										</div>
									</div>

									<div className="pt-2">
										<div className="text-xs text-slate-500 mb-1">{t('reports.detail.section.training.daysDeviation')}</div>
										<Row label={t('reports.detail.section.training.deviation.count')} value={active?.training?.daysDeviation?.count || '—'} />
										<Row label={t('reports.detail.section.training.deviation.reason')} value={active?.training?.daysDeviation?.reason || '—'} />
									</div>
								</div>
							</SoftCard>

							<SoftCard className="p-4">
								<div className="font-extrabold text-slate-900 text-sm mb-3">{t('reports.detail.diet')}</div>
								<div className="space-y-1.5 text-sm">
									<Row label={t('reports.detail.section.diet.hungry')} value={yn(active?.diet?.hungry, t)} />
									<Row label={t('reports.detail.section.diet.comfort')} value={yn(active?.diet?.mentalComfort, t)} />
									<Row label={t('reports.detail.section.diet.tooMuch')} value={yn(active?.diet?.foodTooMuch, t)} />
									<Row label={t('reports.detail.section.diet.wantSpecific')} value={active?.diet?.wantSpecific || '—'} />

									<div className="pt-2">
										<div className="text-xs text-slate-500 mb-1">{t('reports.detail.section.diet.deviation.title')}</div>
										<Row label={t('reports.detail.section.diet.deviation.times')} value={active?.diet?.dietDeviation?.times || '—'} />
										<Row label={t('reports.detail.section.diet.deviation.details')} value={active?.diet?.dietDeviation?.details || '—'} />
									</div>
								</div>
							</SoftCard>
						</div>

						{/* Feedback */}
						<SoftCard className="p-4">
							<div className="flex items-center justify-between gap-2 mb-3">
								<div className="flex items-center gap-2">
									<div
										className="grid place-items-center rounded-lg"
										style={{
											width: 40,
											height: 40,
											background: 'linear-gradient(135deg, var(--color-secondary-100), var(--color-primary-100))',
										}}
									>
										<MessageSquareText className="w-5 h-5" style={{ color: 'var(--color-primary-800)' }} />
									</div>
									<div className="font-extrabold text-slate-900 text-sm">{t('reports.detail.feedback')}</div>
								</div>

								{savedOk ? (
									<Pill tone="ok">
										<CheckCircle2 className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1" />
										{t('reports.messages.saved')}
									</Pill>
								) : null}
							</div>

							<textarea
								className="w-full rounded-lg border bg-white px-4 py-3 text-sm min-h-[120px] focus:outline-none focus-visible:ring-4"
								style={{
									borderColor: 'rgba(148,163,184,0.8)',
									['--tw-ring-color']: 'var(--color-primary-200)',
								}}
								placeholder={t('reports.detail.feedbackPh')}
								value={feedbackDraft}
								onChange={e => setFeedbackDraft(e.target.value)}
							/>

							{saveErr ? <div className="mt-2 text-sm text-rose-700">{saveErr}</div> : null}

							<div className="mt-3 flex items-center justify-end gap-2">
								<GhostBtn title={t('reports.detail.title')} onClick={closeDetail}>
									{t('reports.close', { default: 'Close' })}
								</GhostBtn>

								<GradientBtn
									title={t('reports.reviewed')}
									disabled={saving}
									onClick={() => handleSaveFeedback({ feedback: feedbackDraft || '' })}
								>
									{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
									{t('reports.reviewed')}
								</GradientBtn>
							</div>
						</SoftCard>
					</div>
				)}
			</Modal>
		</div>
	);
}

/* -------------------------------- Subparts -------------------------------- */
function Row({ label, value }) {
	return (
		<div className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0" style={{ borderColor: 'rgba(241,245,249,1)' }}>
			<div className="text-xs text-slate-500">{label}</div>
			<div className="text-sm font-semibold text-slate-900">{value}</div>
		</div>
	);
}

function yn(val, t) {
	if (val === 'yes') return t('reports.yes');
	if (val === 'no') return t('reports.no');
	return val ?? '—';
}
