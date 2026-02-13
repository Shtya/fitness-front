 
'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'use-intl';
import { useRouter } from 'next/navigation';

import api, { baseImg } from '@/utils/axios';
import { toast } from 'react-hot-toast';

import { FiEye, FiSearch, FiX } from 'react-icons/fi';
import { FaSpinner } from 'react-icons/fa6';

import Select from '@/components/atoms/Select';
import Input from '@/components/atoms/Input';
import { Modal, StatCard } from '@/components/dashboard/ui/UI';
import MultiLangText from '@/components/atoms/MultiLangText';
import Img from '@/components/atoms/Img';

import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';

// ✅ import your DataTable + PrettyPagination


import { FileText, Search, Eye, Layers, Sparkles, Link as LinkIcon, Users } from 'lucide-react';
import DataTable from '@/components/dashboard/ui/DataTable';
import { PrettyPagination } from '@/components/dashboard/ui/Pagination';

const PAGE_SIZE = 50;

const cx = (...c) => c.filter(Boolean).join(' ');

/* ---------------- Theme helpers ---------------- */

function ThemeFrame({ children, className = '' }) {
	return (
		<div
			className={cx('rounded-2xl p-[1px]', className)}

		>
			<div
				className="rounded-2xl border bg-white/85 backdrop-blur-xl"
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
			className={cx('rounded-2xl border bg-white', className)}
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
			className="inline-flex items-center gap-2 h-11 px-4 rounded-2xl border transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 disabled:opacity-60 disabled:cursor-not-allowed"
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
			className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl border transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 disabled:opacity-60 disabled:cursor-not-allowed"
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

/* ----------------------------- page ----------------------------------- */

export default function SubmissionsPage() {
	const t = useTranslations('submissions');
	const router = useRouter();

	const [forms, setForms] = useState([]);
	const [submissions, setSubmissions] = useState([]);

	const [loadingForms, setLoadingForms] = useState(true);
	const [loadingSubs, setLoadingSubs] = useState(false);

	const [selectedFormId, setSelectedFormId] = useState('all');
	const [query, setQuery] = useState('');

	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / PAGE_SIZE)), [total]);

	// Submission modal
	const [selectedSubmission, setSelectedSubmission] = useState(null);
	const [showSubmissionModal, setShowSubmissionModal] = useState(false);

	// debounce search
	const [debouncedQuery, setDebouncedQuery] = useState('');
	const debounceTimer = useRef(null);
	useEffect(() => {
		clearTimeout(debounceTimer.current);
		debounceTimer.current = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 250);
		return () => clearTimeout(debounceTimer.current);
	}, [query]);

	useEffect(() => {
		loadForms();
	}, []);

	useEffect(() => {
		if (!forms.length) return;
		setPage(1);
		loadSubmissions({ resetPage: true, forcedPage: 1 });
	}, [forms, selectedFormId]);

	useEffect(() => {
		if (!forms.length) return;
		if (selectedFormId === 'all') return; // aggregated mode: we always load first page for each form
		loadSubmissions({ resetPage: true, forcedPage: page });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page]);

	const loadForms = async () => {
		setLoadingForms(true);
		try {
			const res = await api.get('/forms');
			const list = res?.data?.data || res?.data || [];
			setForms(Array.isArray(list) ? list : []);
		} catch (err) {
			toast.error(t('messages.load_forms_failed'));
		} finally {
			setLoadingForms(false);
		}
	};

	const normalizeSubmission = sub => ({
		...sub,
		form_id: sub?.form?.id ?? sub?.form_id ?? null,
	});

	const loadSubmissions = async ({ resetPage = false, forcedPage } = {}) => {
		setLoadingSubs(true);
		try {
			if (selectedFormId === 'all') {
				// aggregate 1st page from all forms (existing behavior)
				const reqs = forms.map(f =>
					api
						.get(`/forms/${f.id}/submissions`, { params: { page: 1, limit: PAGE_SIZE } })
						.then(r => ({ formId: f.id, ...r.data }))
						.catch(() => ({ formId: f.id, data: [], total: 0 })),
				);

				const results = await Promise.all(reqs);

				let aggregated = [];
				let totalCount = 0;

				for (const r of results) {
					const arr = (r?.data || []).map(normalizeSubmission);
					aggregated = aggregated.concat(arr);
					totalCount += r?.total || 0;
				}

				aggregated.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
				setTotal(totalCount);
				setSubmissions(aggregated);
			} else {
				const currentPage = forcedPage ?? page;
				const r = await api.get(`/forms/${selectedFormId}/submissions`, {
					params: { page: currentPage, limit: PAGE_SIZE },
				});

				const rows = (r?.data?.data || r?.data || []).map(normalizeSubmission);
				setSubmissions(rows);
				setTotal(r?.data?.total ?? rows.length);
			}
		} catch (err) {
			toast.error(t('messages.load_submissions_failed'));
		} finally {
			setLoadingSubs(false);
		}
	};

	const filteredSubmissions = useMemo(() => {
		const q = debouncedQuery;
		if (!q) return submissions;

		return submissions.filter(s => {
			const formTitle = forms.find(f => f.id == s.form_id)?.title?.toLowerCase() || '';
			const email = s.email?.toLowerCase() || '';
			const phone = s.phone?.toLowerCase() || '';
			const ip = s.ipAddress?.toLowerCase() || '';
			const inAnswers =
				s.answers &&
				Object.values(s.answers).some(v =>
					String(Array.isArray(v) ? v.join(', ') : v)
						.toLowerCase()
						.includes(q),
				);
			return formTitle.includes(q) || email.includes(q) || phone.includes(q) || ip.includes(q) || inAnswers;
		});
	}, [submissions, forms, debouncedQuery]);

	const viewSubmission = submission => {
		setSelectedSubmission(submission);
		setShowSubmissionModal(true);
	};

	const headerStats = useMemo(() => {
		const totalShown = filteredSubmissions.length;
		const uniqueForms = new Set(filteredSubmissions.map(s => String(s.form_id ?? ''))).size;
		return { totalShown, uniqueForms };
	}, [filteredSubmissions]);

	const columns = useMemo(
		() => [
			{
				header: t('table.form'),
				accessor: '__formTitle',
				cell: row => {
					const form = forms.find(f => f.id == row.form_id);
					return (
						<div className="flex items-center gap-3 min-w-[240px]">
							<div
								className="grid place-items-center rounded-2xl"
								style={{
									width: 40,
									height: 40,
									background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-200))',
									boxShadow: '0 12px 20px rgba(15,23,42,0.08)',
								}}
							>
								<FileText className="w-5 h-5" style={{ color: 'var(--color-primary-800)' }} />
							</div>
							<div className="min-w-0">
								<MultiLangText className="font-extrabold text-slate-900 truncate max-w-[420px]">
									{form?.title || t('labels.unknown_form')}
								</MultiLangText>
								<div className="mt-0.5 text-xs text-slate-500 flex items-center gap-2">
									<Pill tone="primary">#{row.id}</Pill>
									<span className="hidden sm:inline">
										{new Date(row.created_at).toLocaleDateString()} • {new Date(row.created_at).toLocaleTimeString()}
									</span>
								</div>
							</div>
						</div>
					);
				},
			},
			{
				header: t('table.email'),
				accessor: 'email',
				className: 'font-en',
				cell: row => (
					<div className="max-w-[260px] truncate font-en">
						{row.email || <span className="text-slate-400">—</span>}
					</div>
				),
			},
			{
				header: t('table.phone'),
				accessor: 'phone',
				className: 'font-en',
				cell: row => (
					<div className="max-w-[190px] truncate font-en">
						{row.phone || <span className="text-slate-400">—</span>}
					</div>
				),
			},
			{
				header: t('table.ip'),
				accessor: 'ipAddress',
				className: 'font-en',
				cell: row => (
					<span
						className="inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-mono"
						style={{
							borderColor: 'var(--color-primary-200)',
							background: 'linear-gradient(135deg, rgba(255,255,255,0.92), var(--color-primary-50))',
							color: 'var(--color-primary-800)',
						}}
					>
						{row.ipAddress || '—'}
					</span>
				),
			},
			{
				header: t('table.submitted'),
				accessor: 'created_at',
				className: 'font-en',
				cell: row => (
					<span className="text-sm text-slate-700 font-en">
						{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
					</span>
				),
			},
			{
				header: t('table.actions'),
				accessor: '__actions',
				cell: row => (
					<div className="flex justify-end">
						<GhostBtn title={t('actions.view')} onClick={() => viewSubmission(row)}>
							<Eye className="w-4 h-4" />
							<span className="text-sm font-semibold">{t('actions.view')}</span>
						</GhostBtn>
					</div>
				),
				className: 'text-right',
			},
		],
		[forms, t],
	);

	if (loadingForms && !forms.length) {
		return (
			<div className="min-h-screen flex items-center justify-center"
				style={{
					background:
						'radial-gradient(1200px 600px at 15% 10%, var(--color-primary-100), transparent 55%),' +
						'radial-gradient(900px 500px at 85% 18%, var(--color-secondary-100), transparent 55%),' +
						'linear-gradient(180deg, #ffffff, #f8fafc)',
				}}
			>
				<FaSpinner className="animate-spin h-8 w-8" style={{ color: 'var(--color-primary-600)' }} />
			</div>
		);
	}

	return (
		<div
			className="min-h-screen"

		>
			<div className=" ">
				{/* ✅ Theme header using your GradientStatsHeader */}
				<GradientStatsHeader
					title={t('header.title')}
					desc={t('header.desc')}
					icon={Sparkles}
					btnName={t('header.new', { default: t('filters.all_forms') })}
					onClick={() => router.push('/dashboard/intake/forms')}

				>

					<StatCard icon={Users} title={t('labels.total')} value={total || 0} />
					<StatCard icon={Users} title={t('labels.shown')} value={headerStats.totalShown} />
					<StatCard icon={Users} title={t('labels.forms')} value={headerStats.uniqueForms} />


				</GradientStatsHeader>


				{/* ===== FILTERS BAR ===== */}
				<div className='flex items-center justify-between gap-2.5 mt-8 flex-wrap'>


					<div className="relative  ">
						<Input
							cnInput="rtl:pr-8 ltr:pl-8"
							label=""
							cnInputParent='w-[300px]'
							placeholder={t('filters.search_placeholder')}
							value={query}
							onChange={setQuery}
						/>
						<Search size={18} className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-gray-300" />
					</div>
					<Select
						value={selectedFormId}
						onChange={val => setSelectedFormId(val)}
						options={[{ id: 'all', label: t('filters.all_forms') }, ...forms.map(f => ({ id: f.id, label: f.title }))]}
					/>

				</div>

				{/* ✅ DataTable (theme styled already) */}
				<div className="mt-6">
					<ThemeFrame>


						<DataTable
							columns={columns}
							data={filteredSubmissions}
							loading={loadingSubs}
							itemsPerPage={PAGE_SIZE}
							// pagination={false} // ✅ we use PrettyPagination above (server paging)
							serverPagination={true}
							stickyHeader={true}
							emptyState={
								<div className="text-center py-12">
									<div
										className="mx-auto mb-4 grid place-items-center rounded-3xl"
										style={{
											width: 72,
											height: 72,
											background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-secondary-100))',
											boxShadow: '0 18px 36px rgba(15,23,42,0.12)',
										}}
									>
										<FileText className="w-8 h-8" style={{ color: 'var(--color-primary-700)' }} />
									</div>
									<h3 className="text-lg font-extrabold text-slate-900 mb-1">{t('empty.title')}</h3>
									<p className="text-slate-600">
										{selectedFormId === 'all' ? t('empty.subtitle_all') : t('empty.subtitle_one')}
									</p>
								</div>
							}

							pagination selectable={false} page={page}
							onPageChange={p => setPage(p)} totalRows={totalPages}
						/>

					</ThemeFrame>
				</div>
			</div>

			{/* Submission Detail Modal */}
			<Modal
				open={showSubmissionModal && !!selectedSubmission}
				onClose={() => setShowSubmissionModal(false)}
				title={t('detail.title')}
				maxW="max-w-4xl"
			>
				{selectedSubmission && (
					<div className="space-y-6 pt-2">
						<SoftCard className="p-4">
							<div className="flex items-center justify-between gap-3 flex-wrap">
								<div className="flex items-center gap-3">
									<div
										className="grid place-items-center rounded-2xl"
										style={{
											width: 44,
											height: 44,
											background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-200))',
										}}
									>
										<FileText className="w-5 h-5" style={{ color: 'var(--color-primary-800)' }} />
									</div>
									<div>
										<div className="text-sm font-extrabold text-slate-900">{t('detail.contact')}</div>
										<div className="text-xs text-slate-500">
											{new Date(selectedSubmission.created_at).toLocaleString()}
										</div>
									</div>
								</div>

								<Pill tone="primary">
									{forms.find(f => f.id == selectedSubmission.form_id)?.title || t('labels.unknown_form')}
								</Pill>
							</div>

							<div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
								<InfoRow k={t('table.email')} v={selectedSubmission.email} />
								<InfoRow k={t('table.phone')} v={selectedSubmission.phone} />
								<InfoRow k={t('table.ip')} v={selectedSubmission.ipAddress} mono />
							</div>
						</SoftCard>

						<div>
							<div className="flex items-center justify-between gap-3 mb-3">
								<h3 className="font-extrabold text-slate-900">{t('detail.answers')}</h3>
								<Pill tone="soft">{Object.keys(selectedSubmission.answers || {}).length}</Pill>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								{renderAnswers(selectedSubmission, forms, t)}
							</div>
						</div>
					</div>
				)}
			</Modal>
		</div>
	);
}

/** ---------- tiny helpers ---------- */

function InfoRow({ k, v, mono }) {
	return (
		<div
			className="rounded-2xl border p-3"
			style={{
				borderColor: 'var(--color-primary-200)',
				background: 'linear-gradient(135deg, rgba(255,255,255,0.95), var(--color-primary-50))',
			}}
		>
			<div className="text-xs text-slate-500 font-semibold">{k}</div>
			<MultiLangText className={cx('mt-1 text-sm font-extrabold text-slate-900 break-words', mono && 'font-mono')}>
				{String(v ?? '—')}
			</MultiLangText>
		</div>
	);
}

function renderAnswers(submission, forms, t) {
	console.log(submission);
	const form = forms.find(f => f.id == (submission.form_id ?? submission.form?.id));
	const fieldsByKey = new Map((form?.fields || []).map(fld => [fld.key, fld]));
	const entries = Object.entries(submission.answers || {});

	if (!entries.length) {
		return <div className="text-slate-600">{t('detail.no_answers')}</div>;
	}

	// ---- helpers ----
	const isUrl = (s) => typeof s === 'string' && /^(https?:)?\/\//i.test(s.trim());
	const isProbablyPath = (s) => typeof s === 'string' && /\/uploads\/|^uploads\/|^\/uploads\//i.test(s.trim());
	const isImageUrl = (s) =>
		typeof s === 'string' &&
		/\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(s.trim());

	const normalizeUrl = (raw) => {
		if (!raw || typeof raw !== 'string') return '';
		const cleaned = raw.replace(/\\/g, '/').trim();

		// absolute URL -> keep as is
		if (isUrl(cleaned)) return cleaned;

		// relative path -> prefix with baseImg (if you use it)
		// NOTE: baseImg must be defined in your scope like before.
		if (typeof baseImg !== 'undefined' && baseImg) {
			if (cleaned.startsWith('/')) return `${baseImg}${cleaned}`;
			return `${baseImg}/${cleaned}`;
		}

		// fallback
		return cleaned;
	};

	const extractFiles = (value) => {
		// if value is array => treat as files list (common for file fields)
		if (Array.isArray(value)) {
			return value
				.filter(v => typeof v === 'string' && v.trim())
				.map(v => v.replace(/\\/g, '/').trim());
		}

		// if value is string:
		if (typeof value === 'string') {
			const v = value.trim();
			// legacy: "upload...." or paths
			if (v.toLowerCase().startsWith('upload') || isUrl(v) || isProbablyPath(v)) {
				return [v.replace(/\\/g, '/').trim()];
			}
		}

		return [];
	};

	return entries.map(([key, value]) => {
		const fld = fieldsByKey.get(key);
		const label = fld?.label || key;

		const files = extractFiles(value);

		// image files only (for preview grid)
		const imageFiles = files.filter(isImageUrl);

		// printable fallback for non-file answers
		const out =
			value == null
				? ''
				: Array.isArray(value)
					? value.join(', ')
					: typeof value === 'object'
						? JSON.stringify(value)
						: String(value);

		return (
			<div
				key={key}
				className="rounded-3xl border bg-white p-4 w-full overflow-hidden"
				style={{
					borderColor: 'var(--color-primary-200)',
					boxShadow: '0 1px 0 rgba(15,23,42,0.03), 0 10px 24px rgba(15,23,42,0.06)',
				}}
			>
				<div className="flex items-start justify-between gap-3">
					<MultiLangText dirAuto className="text-[11px] uppercase text-slate-500 font-semibold">
						{label}
					</MultiLangText>

					<span
						className="h-6 px-2 rounded-full text-[11px] font-extrabold border"
						style={{
							borderColor: 'var(--color-primary-200)',
							color: 'var(--color-primary-800)',
							background: 'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.9))',
						}}
					>
						{key}
					</span>
				</div>

				<div className="mt-3 text-sm text-slate-900 break-words">
					{/* ✅ IMAGE PREVIEW GRID (when image urls exist) */}
					{imageFiles.length > 0 ? (
						<div className="w-full">
							{console.log(imageFiles)}
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
								{imageFiles.map((rawUrl, idx) => {
									const href = normalizeUrl(rawUrl);
									return (
										<a
											key={`${key}-img-${idx}`}
											href={href}
											target="_blank"
											rel="noopener noreferrer"
											className="block"
										>
											<div
												className="rounded-2xl border overflow-hidden"
												style={{ borderColor: 'var(--color-primary-200)' }}
											>
												{/* use Img with the FINAL url */}
												<Img
													src={rawUrl}
													alt={`${label} ${idx + 1}`}
													className="aspect-square object-cover"
												/>
											</div> 
										</a>
									);
								})}
							</div>

							{/* ✅ show non-image files too if they exist */}
							{files.length > imageFiles.length && (
								<div className="mt-3 space-y-2">
									{files
										.filter(u => !isImageUrl(u))
										.map((rawUrl, idx) => {
											const href = normalizeUrl(rawUrl);
											return (
												<a
													key={`${key}-file-${idx}`}
													href={href}
													target="_blank"
													rel="noopener noreferrer"
													className="text-xs underline text-slate-700"
												>
													{t('labels.open', { default: 'Open' })}: {rawUrl}
												</a>
											);
										})}
								</div>
							)}
						</div>
					) : files.length > 0 ? (
						/* ✅ FILE LINKS (non-image or unknown extension) */
						<div className="space-y-2">
							{files.map((rawUrl, idx) => {
								const href = normalizeUrl(rawUrl);
								return (
									<a
										key={`${key}-link-${idx}`}
										href={href}
										target="_blank"
										rel="noopener noreferrer"
										className="text-sm underline text-slate-700"
									>
										{t('labels.open', { default: 'Open' })}: {rawUrl}
									</a>
								);
							})}
						</div>
					) : out ? (
						<MultiLangText>{out}</MultiLangText>
					) : (
						<span className="text-slate-400">—</span>
					)}
				</div>

				<div
					className="mt-4 h-px"
					style={{
						background: 'linear-gradient(90deg, transparent, var(--color-primary-200), transparent)',
					}}
				/>
			</div>
		);
	});
}

