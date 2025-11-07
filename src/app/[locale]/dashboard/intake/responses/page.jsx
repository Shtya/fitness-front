'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'use-intl';

import api from '@/utils/axios';
import { toast } from 'react-hot-toast';
import {
	FiFileText,
	FiEye,
	FiPlus,
	FiUsers,
	FiLink2,
	FiSearch,
	FiCalendar,
} from 'react-icons/fi';
import { FaSpinner } from 'react-icons/fa6';

import Select from '@/components/atoms/Select';
import Input from '@/components/atoms/Input';
import { Modal } from '@/components/dashboard/ui/UI';
import MultiLangText from '@/components/atoms/MultiLangText';

const PAGE_SIZE = 50;

/* ----------------- small UI atoms ------------------ */

const cx = (...c) => c.filter(Boolean).join(' ');

function IconButton({ title, onClick, children, tone = 'slate', disabled }) {
	const tones = {
		slate: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-300',
		indigo: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-400',
		emerald: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-400',
	};
	const base = 'inline-flex items-center gap-2 h-9 px-3 rounded-lg border transition focus:outline-none focus:ring-2';
	const toneCls =
		tone === 'slate'
			? tones.slate
			: tone === 'indigo'
				? tones.indigo + ' border-transparent'
				: tones.emerald + ' border-transparent';
	return (
		<button
			type='button'
			title={title}
			aria-label={title}
			disabled={disabled}
			onClick={onClick}
			className={cx(base, toneCls, disabled && 'opacity-60 cursor-not-allowed')}
		>
			{children}
		</button>
	);
}

function PrimaryButton({ children, onClick, tone = 'indigo', disabled }) {
	return (
		<button
			type='button'
			onClick={onClick}
			disabled={disabled}
			className={cx(
				'inline-flex items-center gap-2 h-9 px-4 rounded-lg text-white transition focus:outline-none focus:ring-2',
				tone === 'indigo'
					? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-400'
					: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-400',
				disabled && 'opacity-60 cursor-not-allowed'
			)}
		>
			{children}
		</button>
	);
}

function Th({ children, className }) {
	return (
		<th className={cx(
			'px-4 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap sticky top-0 bg-slate-50 z-10',
			className
		)}>
			{children}
		</th>
	);
}
function Td({ children, className }) {
	return <td className={cx('px-4 py-3 text-sm text-slate-700', className)}>{children}</td>;
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
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');
	const [dateWarning, setDateWarning] = useState('');

	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);

	// Create Form modal
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [newFormTitle, setNewFormTitle] = useState('');
	const [afterCreateAssignUserId, setAfterCreateAssignUserId] = useState('');

	// Submission modal (and assign)
	const [selectedSubmission, setSelectedSubmission] = useState(null);
	const [showSubmissionModal, setShowSubmissionModal] = useState(false);
	const [clients, setClients] = useState([]);
	const [assignUserId, setAssignUserId] = useState('');
	const [assignLoading, setAssignLoading] = useState(false);

	// debounce search
	const [debouncedQuery, setDebouncedQuery] = useState('');
	const debounceTimer = useRef(null);
	useEffect(() => {
		clearTimeout(debounceTimer.current);
		debounceTimer.current = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 250);
		return () => clearTimeout(debounceTimer.current);
	}, [query]);

	// validate date range
	useEffect(() => {
		if (dateFrom && dateTo) {
			const from = new Date(dateFrom).getTime();
			const to = new Date(dateTo).getTime();
			setDateWarning(from > to ? t('errors.from_before_to') : '');
		} else {
			setDateWarning('');
		}
	}, [dateFrom, dateTo, t]);

	useEffect(() => {
		loadForms();
		// Optional: fetch clients for assignment combo
		loadClients();
	}, []);

	useEffect(() => {
		if (!forms.length) return;
		setPage(1);
		loadSubmissions('reset');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [forms, selectedFormId, dateFrom, dateTo]);

	const loadClients = async () => {
		try {
			// لو عندك endpoint واضح لجلب العملاء، عدّله هنا:
			// const r = await api.get('/users', { params: { role: 'client', limit: 1000 }});
			// setClients(r.data?.data || r.data || []);
			setClients([]); // fallback: مدخل يدوي للـ userId
		} catch {
			setClients([]);
		}
	};

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

	const normalizeSubmission = (sub) => ({
		...sub,
		form_id: sub?.form?.id ?? sub?.form_id ?? null,
	});

	const withinRange = (dt) => {
		if (!dt) return true;
		const tms = new Date(dt).getTime();
		if (dateFrom) {
			const from = new Date(dateFrom + 'T00:00:00').getTime();
			if (tms < from) return false;
		}
		if (dateTo) {
			const to = new Date(dateTo + 'T23:59:59').getTime();
			if (tms > to) return false;
		}
		return true;
	};

	const loadSubmissions = async (mode = 'append') => {
		if (dateWarning) return;
		setLoadingSubs(true);
		try {
			if (selectedFormId === 'all') {
				const reqs = forms.map((f) =>
					api
						.get(`/forms/${f.id}/submissions`, { params: { page: 1, limit: PAGE_SIZE } })
						.then((r) => ({ formId: f.id, ...r.data }))
						.catch(() => ({ formId: f.id, data: [], total: 0 }))
				);
				const results = await Promise.all(reqs);
				let aggregated = [];
				let totalCount = 0;
				for (const r of results) {
					const arr = (r?.data || []).map(normalizeSubmission).filter((s) => withinRange(s.created_at));
					aggregated = aggregated.concat(arr);
					totalCount += r?.total || 0;
				}
				aggregated.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
				setTotal(totalCount);
				setSubmissions(aggregated);
			} else {
				const r = await api.get(`/forms/${selectedFormId}/submissions`, {
					params: { page, limit: PAGE_SIZE },
				});
				const rows = (r?.data?.data || r?.data || [])
					.map(normalizeSubmission)
					.filter((s) => withinRange(s.created_at));
				const newList = mode === 'append' ? [...submissions, ...rows] : rows;
				setSubmissions(newList);
				setTotal(r?.data?.total ?? newList.length);
			}
		} catch (err) {
			toast.error(t('messages.load_submissions_failed'));
		} finally {
			setLoadingSubs(false);
		}
	};

	const onLoadMore = () => {
		if (selectedFormId === 'all') return;
		setPage((p) => p + 1);
		setTimeout(() => loadSubmissions('append'), 0);
	};

	const filteredSubmissions = useMemo(() => {
		const q = debouncedQuery;
		if (!q) return submissions;
		return submissions.filter((s) => {
			const formTitle = forms.find((f) => f.id == s.form_id)?.title?.toLowerCase() || '';
			const email = s.email?.toLowerCase() || '';
			const phone = s.phone?.toLowerCase() || '';
			const ip = s.ipAddress?.toLowerCase() || '';
			const inAnswers =
				s.answers &&
				Object.values(s.answers).some((v) =>
					String(Array.isArray(v) ? v.join(', ') : v).toLowerCase().includes(q)
				);
			return formTitle.includes(q) || email.includes(q) || phone.includes(q) || ip.includes(q) || inAnswers;
		});
	}, [submissions, forms, debouncedQuery]);

	const viewSubmission = (submission) => {
		setSelectedSubmission(submission);
		setAssignUserId(submission?.assignedToId || '');
		setShowSubmissionModal(true);
	};

	/* ------------ Create Form (simple) + optional assign via creating a dummy submission? ------------
		 مافيش منطق “تعيين فورم” في الـ backend (المتاح هو Assign Submission).
		 بالتالي أضفنا إنشاء نموذج بسيط فقط. التركيز الفعلي للتعيين موجود داخل مودال السابميشن.
	*/

	const createForm = async () => {
		const title = (newFormTitle || '').trim();
		if (!title) {
			toast.error(t('errors.title_required'));
			return;
		}
		try {
			await api.post('/forms', { title, fields: [] });
			toast.success(t('messages.form_created'));
			setNewFormTitle('');
			setAfterCreateAssignUserId('');
			setShowCreateForm(false);
			loadForms();
		} catch {
			toast.error(t('messages.create_form_failed'));
		}
	};

	const assignSubmission = async () => {
		if (!selectedSubmission?.id || !selectedSubmission?.form_id) return;
		const uid = (assignUserId || '').trim();
		if (!uid) {
			toast.error(t('errors.user_required'));
			return;
		}
		setAssignLoading(true);
		try {
			await api.post(`/forms/${selectedSubmission.form_id}/submissions/${selectedSubmission.id}/assign`, {
				userId: uid,
			});
			toast.success(t('messages.assigned_ok'));
			// reflect locally
			setSelectedSubmission((prev) => prev ? { ...prev, assignedToId: uid, assignedAt: new Date().toISOString() } : prev);
		} catch (e) {
			toast.error(t('messages.assign_failed'));
		} finally {
			setAssignLoading(false);
		}
	};

	if (loadingForms && !forms.length) {
		return (
			<div className='min-h-screen bg-slate-50 flex items-center justify-center'>
				<FaSpinner className='animate-spin h-8 w-8 text-indigo-600' />
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-slate-50'>
			<div className='container !px-0 py-8'>
				{/* Header */}
				<div className='relative overflow-hidden rounded-lg border border-indigo-100/60 bg-white/60 shadow-sm backdrop-blur'>
					<div className='absolute inset-0 overflow-hidden'>
						<div className='absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-95' />
						<div
							className='absolute inset-0 opacity-15'
							style={{
								backgroundImage:
									'linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)',
								backgroundSize: '22px 22px',
								backgroundPosition: '-1px -1px',
							}}
						/>
						<div className='absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl' />
						<div className='absolute -bottom-16 -right-8 h-60 w-60 rounded-full bg-blue-300/30 blur-3xl' />
					</div>

					<div className='relative py-3 p-3 md:p-5 text-white'>
						<div className='flex items-center justify-between gap-3 flex-wrap'>
							<div className='space-y-1'>
								<h1 className='text-xl md:text-4xl font-semibold'>{t('header.title')}</h1>
								<p className='text-white/85 max-md:hidden'>{t('header.desc')}</p>
							</div>

							<div className='grid grid-cols-1 md:grid-cols-3 gap-3 w-full md:w-auto md:min-w-[720px]'>
								<div className='md:col-span-2'>
									<div className='relative'>
										<Input
											label=''
											placeholder={t('filters.search_placeholder')}
											value={query}
											onChange={setQuery}
										/>
										<FiSearch className='absolute right-3 top-1/2 -translate-y-1/2 text-white/80' />
									</div>
								</div>


								<div className='md:col-span-1 max-w-[300px] w-full'>
									<Select
										value={selectedFormId}
										onChange={(val) => setSelectedFormId(val)}
										options={[
											{ id: 'all', label: t('filters.all_forms') },
											...forms.map((f) => ({ id: f.id, label: f.title })),
										]}
									/>
								</div>
							</div>

							<div className='w-full flex justify-end'>
								<PrimaryButton onClick={() => setShowCreateForm(true)} tone='emerald'>
									<FiPlus className='w-4 h-4' />
									<span className='text-sm font-medium'>{t('header.new_form')}</span>
								</PrimaryButton>
							</div>
						</div>

						{dateWarning && (
							<div className='mt-3 text-xs bg-white/10 rounded-md px-3 py-2'>
								{dateWarning}
							</div>
						)}
					</div>
				</div>

				{/* Table */}
				<div className='rounded-lg border border-slate-200 bg-white overflow-hidden mt-6'>
					<div className='overflow-x-auto'>
						<table className='min-w-full divide-y divide-slate-200'>
							<thead className='bg-slate-50'>
								<tr>
									<Th className='min-w-[220px]'>{t('table.form')}</Th>
									<Th>{t('table.email')}</Th>
									<Th>{t('table.phone')}</Th>
									<Th>{t('table.ip')}</Th>
									<Th>{t('table.submitted')}</Th>
									<Th className='text-right pr-6'>{t('table.actions')}</Th>
								</tr>
							</thead>
							<tbody className='divide-y divide-slate-100'>
								{loadingSubs && submissions.length === 0
									? [...Array(5)].map((_, i) => (
										<tr key={i} className='animate-pulse'>
											<Td><div className='h-4 w-40 bg-slate-200 rounded' /></Td>
											<Td><div className='h-4 w-28 bg-slate-200 rounded' /></Td>
											<Td><div className='h-4 w-24 bg-slate-200 rounded' /></Td>
											<Td><div className='h-4 w-24 bg-slate-200 rounded' /></Td>
											<Td><div className='h-4 w-32 bg-slate-200 rounded' /></Td>
											<Td className='text-right pr-6'><div className='h-9 w-20 bg-slate-200 rounded' /></Td>
										</tr>
									))
									: filteredSubmissions.map((s) => {
										const form = forms.find((f) => f.id == s.form_id);
										return (
											<tr key={s.id} className='hover:bg-slate-50'>
												<Td>
													<div className='flex items-center gap-2'>
														<span className='p-2 bg-indigo-100 rounded-lg'>
															<FiFileText className='w-4 h-4 text-indigo-600' />
														</span>
														<MultiLangText className='font-medium text-slate-900 truncate max-w-[360px]'>
															{form?.title || t('labels.unknown_form')}
														</MultiLangText>
													</div>
												</Td>
												<Td className='truncate max-w-[220px]'>{s.email}</Td>
												<Td className='truncate max-w-[160px]'>{s.phone}</Td>
												<Td className='font-mono text-xs'>{s.ipAddress}</Td>
												<Td>{new Date(s.created_at).toLocaleString()}</Td>
												<Td className='text-right pr-6'>
													<IconButton title={t('actions.view')} onClick={() => viewSubmission(s)} tone='slate'>
														<FiEye className='w-4 h-4' />
														<span className='text-sm'>{t('actions.view')}</span>
													</IconButton>
												</Td>
											</tr>
										);
									})}
							</tbody>
						</table>
					</div>

					{/* Empty state */}
					{!loadingSubs && filteredSubmissions.length === 0 && (
						<div className='text-center py-12'>
							<FiFileText className='h-12 w-12 text-slate-300 mx-auto mb-4' />
							<h3 className='text-lg font-semibold text-slate-900 mb-1'>
								{t('empty.title')}
							</h3>
							<p className='text-slate-600'>
								{selectedFormId === 'all' ? t('empty.subtitle_all') : t('empty.subtitle_one')}
							</p>
						</div>
					)}

					{/* Pager */}
					{selectedFormId !== 'all' &&
						filteredSubmissions.length > 0 &&
						filteredSubmissions.length < total && (
							<div className='p-4 border-top border-slate-200 flex justify-center'>
								<PrimaryButton onClick={onLoadMore} tone='indigo'>
									<FiEye className='w-4 h-4' />
									<span className='text-sm font-medium'>{t('actions.load_more')}</span>
								</PrimaryButton>
							</div>
						)}
				</div>
			</div>

			{/* Submission Detail Modal */}
			<Modal
				open={showSubmissionModal && !!selectedSubmission}
				onClose={() => setShowSubmissionModal(false)}
				title={t('detail.title')}
				maxW='max-w-4xl'
			>
				{selectedSubmission && (
					<div className='space-y-6'>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
							<Box title={t('detail.contact')}>
								<Row k={t('table.email')} v={selectedSubmission.email} />
								<Row k={t('table.phone')} v={selectedSubmission.phone} />
								<Row k={t('table.ip')} v={selectedSubmission.ipAddress} mono />
								<Row k={t('table.submitted')} v={new Date(selectedSubmission.created_at).toLocaleString()} />
							</Box>

							<Box title={t('detail.form')}>
								<Row
									k={t('table.form')}
									v={forms.find((f) => f.id == selectedSubmission.form_id)?.title || t('labels.unknown_form')}
								/>
								<Row k={t('detail.submission_id')} v={selectedSubmission.id} mono />
							</Box>
						</div>

						<div>
							<h3 className='font-semibold text-slate-900 mb-3'>{t('detail.answers')}</h3>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
								{renderAnswers(selectedSubmission, forms, t)}
							</div>
						</div>

						{/* Assign to client */}
						<div className='rounded-lg border border-slate-200 bg-white p-4'>
							<div className='flex items-center gap-2 mb-3'>
								<FiUsers className='w-4 h-4 text-indigo-600' />
								<div className='font-medium text-slate-900'>{t('assign.title')}</div>
							</div>

							<div className='grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3'>
								{clients.length ? (
									<Select
										label={t('assign.client')}
										value={assignUserId}
										onChange={setAssignUserId}
										options={clients.map((u) => ({ id: u.id, label: u.name || u.email || u.id }))}
									/>
								) : (
									<Input
										label={t('assign.client_id')}
										placeholder='uuid'
										value={assignUserId}
										onChange={setAssignUserId}
									/>
								)}

								<PrimaryButton onClick={assignSubmission} tone='indigo' disabled={assignLoading}>
									{assignLoading ? (
										<FaSpinner className='w-4 h-4 animate-spin' />
									) : (
										<FiLink2 className='w-4 h-4' />
									)}
									<span className='text-sm font-medium'>{t('assign.cta')}</span>
								</PrimaryButton>
							</div>

							{selectedSubmission?.assignedToId && (
								<div className='mt-2 text-xs text-emerald-700'>
									{t('assign.assigned_to')} {selectedSubmission.assignedToId}{' '}
									{selectedSubmission.assignedAt ? `• ${new Date(selectedSubmission.assignedAt).toLocaleString()}` : ''}
								</div>
							)}
						</div>

						<div className='flex justify-end gap-2 pt-2'>
							<IconButton title={t('actions.close')} onClick={() => setShowSubmissionModal(false)} tone='slate'>
								<span className='text-sm font-medium'>{t('actions.close')}</span>
							</IconButton>
						</div>
					</div>
				)}
			</Modal>

			{/* Create Form Modal (simple) */}
			<Modal
				open={showCreateForm}
				onClose={() => setShowCreateForm(false)}
				title={t('create.title')}
				maxW='max-w-md'
			>
				<div className='space-y-4'>
					<Input
						label={t('create.form_title')}
						placeholder={t('create.form_title_ph')}
						value={newFormTitle}
						onChange={setNewFormTitle}
					/>

					{/* مبدئياً مجرد إدخال نصي اختياري — التعيين الفعلي يحصل على Submission من مودال التفاصيل */}
					<Input
						label={t('create.assign_optional')}
						placeholder={t('create.assign_optional_ph')}
						value={afterCreateAssignUserId}
						onChange={setAfterCreateAssignUserId}
					/>

					<div className='flex justify-end gap-2 pt-2'>
						<IconButton title={t('actions.cancel')} onClick={() => setShowCreateForm(false)} tone='slate'>
							{t('actions.cancel')}
						</IconButton>
						<PrimaryButton onClick={createForm} tone='emerald'>
							<FiPlus className='w-4 h-4' />
							<span className='text-sm font-medium'>{t('create.cta')}</span>
						</PrimaryButton>
					</div>
				</div>
			</Modal>
		</div>
	);
}

/** ---------- tiny helpers ---------- */

function Box({ title, children }) {
	return (
		<div className='rounded-lg border border-slate-200 bg-slate-50 p-4'>
			<div className='text-sm font-semibold text-slate-900 mb-2'>{title}</div>
			<div className='space-y-1'>{children}</div>
		</div>
	);
}

function Row({ k, v, mono }) {
	return (
		<div className='text-sm'>
			<span className='text-slate-500'>{k}: </span>
			<MultiLangText className={mono ? 'font-mono' : 'font-medium'}>{String(v ?? '')}</MultiLangText>
		</div>
	);
}

function renderAnswers(submission, forms, t) {
	const form = forms.find((f) => f.id == submission.form_id);
	const fieldsByKey = new Map((form?.fields || []).map((fld) => [fld.key, fld]));
	const entries = Object.entries(submission.answers || {});
	if (!entries.length) {
		return <div className='text-slate-600'>{t('detail.no_answers')}</div>;
	}
	return entries.map(([key, value]) => {
		const fld = fieldsByKey.get(key);
		const label = fld?.label || key;
		const out =
			value == null
				? ''
				: Array.isArray(value)
					? value.join(', ')
					: typeof value === 'object'
						? JSON.stringify(value)
						: String(value);
		return (
			<div key={key} className='rounded-lg border border-slate-200 bg-white p-3 w-full'>
				<MultiLangText dirAuto className='text-xs uppercase text-slate-500 mb-1'>
					{label}
				</MultiLangText>
				<div className='text-sm text-slate-900 break-words'>
					{<MultiLangText>{out}</MultiLangText> || <span className='text-slate-400'>—</span>}
				</div>
			</div>
		);
	});
}
