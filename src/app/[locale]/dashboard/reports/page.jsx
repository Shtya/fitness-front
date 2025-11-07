/* 
	- why the filters select doesn't work here should send teh filter that i click on it to the back to retun the values
	- send in the payload filters[key] : value

	tell me edit where 
	*/

'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Loader2, Eye, CheckCircle2, XCircle, User2, CalendarDays, HeartPulse, Activity, ClipboardList } from 'lucide-react';
import { useTranslations } from 'next-intl';
import qs from 'qs';

import api from '@/utils/axios';
import Img from '@/components/atoms/Img';
import Select from '@/components/atoms/Select';
import { Modal, StatCard, TabsPill } from '@/components/dashboard/ui/UI';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import { useUser } from '@/hooks/useUser';

/* ----------------------------- Tiny UI helpers ----------------------------- */
const Button = ({ children, className = '', onClick, type = 'button', disabled, color = 'primary' }) => {
	const base = 'inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-semibold shadow-sm transition active:scale-[.98]';
	const styles = {
		primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50',
		neutral: 'bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:opacity-50',
		success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50',
		danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50',
		ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 disabled:opacity-50',
	};
	return (
		<button type={type} onClick={onClick} disabled={disabled} className={[base, styles[color] || styles.primary, className].join(' ')}>
			{children}
		</button>
	);
};

const StatPill = ({ icon: Icon, label, value }) => (
	<div className='flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2'>
		<Icon className='w-4 h-4 text-indigo-600' />
		<div className='text-xs text-slate-500'>{label}</div>
		<div className='text-xs font-semibold text-slate-900'>• {value}</div>
	</div>
);

/* --------------------------------- API calls -------------------------------- */
async function fetchReports({ page = 1, limit = 12, sortBy = 'created_at', sortOrder = 'DESC', filters = {} }) {
	console.log('Sending filters:', filters); // Debug log

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
			if (!prev || new Date(r.updated_at) > new Date(prev.updated_at)) {
				map[key] = r; // keep the newest
			}
			return map;
		}, {})
	);

	console.log(uniqueRecords);

	return { total_records: uniqueRecords.length, records: uniqueRecords };
}


async function fetchUserReports(userId, { page = 1, limit = 12, sortBy = 'created_at', sortOrder = 'DESC' }) {
	const { data } = await api.get(`/weekly-reports/users/${userId}/weekly-reports`, { params: { page, limit, sortBy, sortOrder } });
	return {
		items: data?.records || [],
		total: data?.total_records || 0,
		page: data?.current_page || page,
		limit: data?.per_page || limit,
	};
}

/* ---------------------------------- Page ---------------------------------- */
export default function ReportsUnifiedPage() {
	const t = useTranslations('');
	const user = useUser();
	const isReady = !!user?.id;

	// Tabs: 'all' => all reports under this admin; 'clients' => list clients then pick one
	const [tab, setTab] = useState('all'); // 'all' | 'clients'

	// pagination/sort/filters
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(12);
	const [sortBy, setSortBy] = useState('created_at');
	const [sortOrder, setSortOrder] = useState('DESC');
	const [reviewed, setReviewed] = useState('');

	const [loading, setLoading] = useState(false);
	const [err, setErr] = useState('');
	const [reports, setReports] = useState([]);
	const [total, setTotal] = useState(0);

	// clients tab state
	const [clients, setClients] = useState([]);
	const [clientsPage, setClientsPage] = useState(1);
	const [selectedClientId, setSelectedClientId] = useState(null);
	const [clientsLoading, setClientsLoading] = useState(false);

	// detail modal
	const [open, setOpen] = useState(false);
	const [detailLoading, setDetailLoading] = useState(false);
	const [activeId, setActiveId] = useState(null);
	const [active, setActive] = useState(null);
	const [saving, setSaving] = useState(false);
	const [saveErr, setSaveErr] = useState('');
	const [savedOk, setSavedOk] = useState(false);
	const [feedbackDraft, setFeedbackDraft] = useState('');

	const normalizedFilters = useMemo(() => {
		const f = {};
		if (!user?.id) return f;
		f.adminId = user.id;

		if (tab === 'clients' && selectedClientId) {
			f.userId = selectedClientId;
		}

		if (reviewed === 'false') f.isRead = false
		else if (reviewed === 'true') f.isRead = true

		return f;
	}, [tab, user?.id, selectedClientId, reviewed, sortBy, sortOrder]);


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

	// load clients for admin when entering clients tab / switching page
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

	const handleSaveFeedback = async (opts = {}) => {
		if (!activeId) return;
		try {
			setSaving(true);
			setSaveErr('');
			const payload = {
				coachFeedback: typeof opts.feedback === 'string' ? opts.feedback : feedbackDraft,
				isRead: typeof opts.isRead === 'boolean' ? opts.isRead : active?.isRead || false,
			};
			if (!payload.coachFeedback?.trim() && opts?.forceRequire) {
				setSaveErr(t('reports.errors.feedbackEmpty'));
				setSaving(false);
				return;
			}
			const saved = await saveCoachFeedback(activeId, payload);
			setActive(saved);
			setSavedOk(true);
			setTimeout(() => setSavedOk(false), 1600);
			loadReports();
		} catch {
			setSaveErr(t('reports.errors.save'));
		} finally {
			setSaving(false);
		}
	};

	const Card = ({ r }) => {
		const u = r?.user || {};
		const m = r?.measurements || {};
		const tr = r?.training || {};
		const statusReviewed = !!r?.reviewedAt;
		const weightTxt = m?.weight != null ? `${m.weight}` : '—';
		const cardioTxt = tr?.cardioAdherence != null ? `${tr.cardioAdherence}` : '—';

		return (
			<div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition'>
				<div className='flex items-start justify-between gap-2'>
					<div className='flex items-center gap-3'>
						<div className='h-10 w-10 grid place-content-center rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100'>
							<User2 className='w-5 h-5' />
						</div>
						<div>
							<div className='text-sm font-semibold text-slate-900'>{u?.name || u?.email || t('reports.athlete')}</div>
							<div className='text-xs text-slate-500 flex items-center gap-1'>
								<CalendarDays className='w-3.5 h-3.5' />
								<span>{t('reports.columns.weekOf')}: {r?.weekOf}</span>
							</div>
						</div>
					</div>
					<div className='text-xs'>
						{statusReviewed ? (
							<span className='inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-200'>
								<CheckCircle2 className='w-3.5 h-3.5' />
								{t('reports.reviewed')}
							</span>
						) : (
							<span className='inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 border border-amber-200'>
								<XCircle className='w-3.5 h-3.5' />
								{t('reports.awaitingReview')}
							</span>
						)}
					</div>
				</div>

				<div className='mt-3 grid grid-cols-2 gap-2'>
					<StatPill icon={HeartPulse} label={t('reports.card.weight')} value={`${weightTxt} ${t('reports.card.kg')}`} />
					<StatPill icon={Activity} label={t('reports.card.cardio')} value={`${cardioTxt} / 5`} />
				</div>

				<div className='mt-4 flex items-center justify-between'>
					<div className='text-[11px] text-slate-500'>{t('reports.createdAt')}: {new Date(r.created_at).toLocaleString()}</div>
					<Button onClick={() => openDetail(r.id)} className='!px-3 !py-1.5'>
						<Eye className='w-4 h-4 mr-1' />
						{t('reports.view')}
					</Button>
				</div>
			</div>
		);
	};

	const tabs = useMemo(() => ([
		{ key: 'all', label: t('reports.tabs.allReports') },
		{ key: 'clients', label: t('reports.tabs.myClients') },
	]), [t]);

	const clientOptions = useMemo(() => {
		// expects each client item like: { userId, user: { name, email }, email? }
		return [
			{ id: '', label: t('reports.clients.select.placeholder') },
			...clients.map(c => ({
				id: c.userId, // important: this is what you'll filter by
				label: c?.user?.name || c?.email || c.userId
			})),
		];
	}, [clients, t]);


	return (
		<div className='space-y-5'>
			<GradientStatsHeader
				innerCn={"w-full  "}
				title={t('reports.title')}
				desc={t('reports.subtitle')}
				hiddenStats={false}
				someThing={<TabsPill
					tabs={tabs}
					active={tab}
					sliceInPhone={false}
					onChange={key => {
						setTab(key);
						setPage(1);
						if (key === 'all') {
							setSelectedClientId(null);
						}
					}}
					outerCn='!max-w-fit !w-fit '

				/>}
			>
			</GradientStatsHeader>

			{/* Controls row: reviewed, cardio, sortBy, sortOrder */}
			<div className='rounded-lg border border-slate-200 bg-white p-4 sm:p-6 '>
				<div className='grid grid-cols-1 md:grid-cols-4 gap-3'>

					{tab === 'clients' && (
						<div >
							{clientsLoading ? (
								<div className='h-[70px] grid place-content-center text-slate-600'>
									<Loader2 className='w-5 h-5 animate-spin mx-auto mb-2' />
									<div className='text-sm'>{t('reports.loading')}</div>
								</div>
							) : clients.length === 0 ? (
								<div className='h-28 grid place-content-center text-slate-600 text-sm'>
									{t('reports.clients.empty')}
								</div>
							) : (
								<Select
									label={t('reports.clients.title')}
									placeholder={t('reports.clients.select.placeholder')}
									value={selectedClientId || ''}
									onChange={(val) => {
										// val is the selected option id from your Select => here it's userId
										setSelectedClientId(val || null);
										setPage(1);
									}}
									options={clientOptions}
									clearable={true}
									searchable={true}
									className='max-w-md'
								/>
							)}
						</div>
					)}

					<Select
						label={t('reports.filters.reviewed.label')}
						value={reviewed}
						onChange={(val) => {
							setReviewed(val);
							setPage(1);
						}}
						options={[
							{ id: '', label: t('reports.filters.reviewed.any') },
							{ id: 'true', label: t('reports.filters.reviewed.yes') },
							{ id: 'false', label: t('reports.filters.reviewed.no') },
						]}
					/>
					{/* sortBy via Select */}
					<Select
						label={t('reports.filters.sortBy')}
						value={sortBy}
						onChange={(val) => {
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
						onChange={(val) => {
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


			{/* Reports list */}
			<div className='rounded-lg border border-slate-200 bg-white p-4 sm:p-6 '>
				{loading ? (
					<div className='h-40 grid place-content-center text-slate-600'>
						<Loader2 className='w-5 h-5 animate-spin mx-auto mb-2' />
						<div className='text-sm'>{t('reports.loading')}</div>
					</div>
				) : err ? (
					<div className='h-40 grid place-content-center text-rose-700 text-sm'>{err}</div>
				) : reports.length === 0 ? (
					<div className='h-40 grid place-content-center text-slate-600 text-sm'>{t('reports.empty')}</div>
				) : (
					<>
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
							{reports.map(r => (
								<Card key={r.id} r={r} />
							))}
						</div>

						{/* Pagination */}
						<div className='mt-4 flex items-center justify-between'>
							<div className='text-xs text-slate-500'>
								{t('reports.pagination', { page, pages: Math.max(1, Math.ceil(total / (limit || 1))), total })}
							</div>
							<div className='flex items-center gap-2'>
								<Button color='neutral' disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
									{t('reports.prev')}
								</Button>
								<Button color='neutral' disabled={page >= Math.max(1, Math.ceil(total / (limit || 1)))} onClick={() => setPage(p => Math.min(Math.max(1, Math.ceil(total / (limit || 1))), p + 1))}>
									{t('reports.next')}
								</Button>
							</div>
						</div>
					</>
				)}
			</div>

			{/* Detail Modal */}
			<Modal open={open} onClose={closeDetail} title={t('reports.detail.title')} maxW='max-w-5xl' maxH='max-h-[100vh]' maxHBody='max-h-[50vh]'>
				{detailLoading ? (
					<div className='h-48 grid place-content-center text-slate-600'>
						<Loader2 className='w-5 h-5 animate-spin mx-auto mb-2' />
						<div className='text-sm'>{t('reports.detail.loading')}</div>
					</div>
				) : !active ? (
					<div className='text-sm text-slate-600'>{t('reports.empty')}</div>
				) : (
					<div className='space-y-4'>
						{/* Header */}
						<div className='rounded-lg border border-slate-200 bg-white p-3'>
							<div className='flex flex-col md:flex-row md:items-center md:justify-between gap-2'>
								<div className='flex items-center gap-3'>
									<div className='h-10 w-10 grid place-content-center rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100'>
										<User2 className='w-5 h-5' />
									</div>
									<div>
										<div className='text-sm font-semibold text-slate-900'>{active?.user?.name || active?.user?.email}</div>
										<div className='text-xs text-slate-500 flex items-center gap-1'>
											<CalendarDays className='w-3.5 h-3.5' />
											<span>{t('reports.columns.weekOf')}: {active?.weekOf}</span>
										</div>
									</div>
								</div>
								<div className='flex flex-wrap items-center gap-2'>
									{active?.reviewedAt ? (
										<span className='inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-200 text-xs'>
											<CheckCircle2 className='w-3.5 h-3.5' />
											{t('reports.reviewed')}
										</span>
									) : (
										<span className='inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 border border-amber-200 text-xs'>
											<XCircle className='w-3.5 h-3.5' />
											{t('reports.awaitingReview')}
										</span>
									)}
								</div>
							</div>
						</div>

						{/* Photos */}
						<div className='rounded-lg border border-slate-200 bg-white p-3'>
							<div className='font-semibold text-slate-900 text-sm mb-2'>{t('reports.detail.photos')}</div>
							<div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
								{['front', 'back', 'left', 'right'].map(side => {
									const url = active?.photos?.[side]?.url;
									return (
										<div key={side} className='rounded-lg border border-slate-200 bg-slate-50 p-2'>
											<div className='text-[11px] text-slate-600 mb-1'>{t(`reports.detail.section.photos.${side}`)}</div>
											{url ? <Img src={url} alt={side} className='h-40 w-full object-contain rounded-lg bg-white' /> : <div className='h-40 grid place-content-center rounded-lg bg-white text-slate-400 text-xs border border-slate-200'>{t('reports.detail.noPhoto')}</div>}
										</div>
									);
								})}
							</div>
						</div>

						{/* Measurements */}
						<div className='rounded-lg border border-slate-200 bg-white p-3'>
							<div className='font-semibold text-slate-900 text-sm mb-2'>{t('reports.detail.measurements')}</div>
							<div className='overflow-auto'>
								<table className='min-w-[520px] w-full text-sm'>
									<thead className='text-xs text-slate-500'>
										<tr>
											<th className='text-start py-2'>{t('reports.detail.section.measurements.date')}</th>
											<th className='text-start py-2'>{t('reports.detail.section.measurements.weight')}</th>
											<th className='text-start py-2'>{t('reports.detail.section.measurements.waist')}</th>
											<th className='text-start py-2'>{t('reports.detail.section.measurements.chest')}</th>
											<th className='text-start py-2'>{t('reports.detail.section.measurements.hips')}</th>
											<th className='text-start py-2'>{t('reports.detail.section.measurements.arms')}</th>
											<th className='text-start py-2'>{t('reports.detail.section.measurements.thighs')}</th>
										</tr>
									</thead>
									<tbody className='text-slate-800'>
										<tr className='border-t border-slate-100'>
											<td className='py-2'>{active?.measurements?.date || '—'}</td>
											<td className='py-2'>{active?.measurements?.weight ?? '—'}</td>
											<td className='py-2'>{active?.measurements?.waist ?? '—'}</td>
											<td className='py-2'>{active?.measurements?.chest ?? '—'}</td>
											<td className='py-2'>{active?.measurements?.hips ?? '—'}</td>
											<td className='py-2'>{active?.measurements?.arms ?? '—'}</td>
											<td className='py-2'>{active?.measurements?.thighs ?? '—'}</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>

						{/* Training & Diet */}
						<div className='grid md:grid-cols-2 gap-3'>
							<div className='rounded-lg border border-slate-200 bg-white p-3'>
								<div className='font-semibold text-slate-900 text-sm mb-2'>{t('reports.detail.training')}</div>
								<div className='space-y-1.5 text-sm'>
									<Row label={t('reports.detail.section.training.cardioAdherence')} value={(active?.training?.cardioAdherence ?? '—') + ' / 5'} />
									<Row label={t('reports.detail.section.training.intensityOk')} value={yn(active?.training?.intensityOk, t)} />
									<Row label={t('reports.detail.section.training.shape')} value={yn(active?.training?.shapeChange, t)} />
									<Row label={t('reports.detail.section.training.fitness')} value={yn(active?.training?.fitnessChange, t)} />
									<Row label={t('reports.detail.section.training.sleepEnough')} value={yn(active?.training?.sleep?.enough, t)} />
									<Row label={t('reports.detail.section.training.sleepHours')} value={active?.training?.sleep?.hours || '—'} />
									<div className='pt-2'>
										<div className='text-xs text-slate-500 mb-1'>{t('reports.detail.section.training.notes.title')}</div>
										<div className='rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-800 text-sm whitespace-pre-wrap'>{active?.training?.programNotes || '—'}</div>
									</div>
									<div className='pt-2'>
										<div className='text-xs text-slate-500 mb-1'>{t('reports.detail.section.training.daysDeviation')}</div>
										<Row label={t('reports.detail.section.training.deviation.count')} value={active?.training?.daysDeviation?.count || '—'} />
										<Row label={t('reports.detail.section.training.deviation.reason')} value={active?.training?.daysDeviation?.reason || '—'} />
									</div>
								</div>
							</div>

							<div className='rounded-lg border border-slate-200 bg-white p-3'>
								<div className='font-semibold text-slate-900 text-sm mb-2'>{t('reports.detail.diet')}</div>
								<div className='space-y-1.5 text-sm'>
									<Row label={t('reports.detail.section.diet.hungry')} value={yn(active?.diet?.hungry, t)} />
									<Row label={t('reports.detail.section.diet.comfort')} value={yn(active?.diet?.mentalComfort, t)} />
									<Row label={t('reports.detail.section.diet.tooMuch')} value={yn(active?.diet?.foodTooMuch, t)} />
									<Row label={t('reports.detail.section.diet.wantSpecific')} value={active?.diet?.wantSpecific || '—'} />
									<div className='pt-2'>
										<div className='text-xs text-slate-500 mb-1'>{t('reports.detail.section.diet.deviation.title')}</div>
										<Row label={t('reports.detail.section.diet.deviation.times')} value={active?.diet?.dietDeviation?.times || '—'} />
										<Row label={t('reports.detail.section.diet.deviation.details')} value={active?.diet?.dietDeviation?.details || '—'} />
									</div>
								</div>
							</div>
						</div>

						{/* Feedback editor */}
						<div className='rounded-lg border border-slate-200 bg-white p-3'>
							<div className='font-semibold text-slate-900 text-sm mb-2'>{t('reports.detail.feedback')}</div>
							<textarea
								className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[100px]'
								placeholder={t('reports.detail.feedbackPh')}
								value={feedbackDraft}
								onChange={e => setFeedbackDraft(e.target.value)}
							/>
							<div className='mt-2 flex items-center justify-between'>
								<div className='flex items-center gap-2 justify-end  w-full '>
									{savedOk ? (
										<div className='inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'>
											<CheckCircle2 className='w-4 h-4' />
											{t('reports.messages.saved')}
										</div>
									) : null}

									<Button color='success' className='flex items-center gap-2 ' disabled={saving} onClick={() => handleSaveFeedback({ isRead: true, feedback: feedbackDraft || '' })}>
										{saving ? <Loader2 className='w-4 h-4 animate-spin' /> : <CheckCircle2 className='w-4 h-4' />}
										{t('reports.reviewed')}
									</Button>
								</div>
							</div>
						</div>

					</div>
				)}
			</Modal>
		</div>
	);
}

/* -------------------------------- Subparts -------------------------------- */
function Row({ label, value }) {
	return (
		<div className='flex items-center justify-between gap-3 border-b border-slate-100 py-1.5 last:border-b-0'>
			<div className='text-xs text-slate-500'>{label}</div>
			<div className='text-sm font-medium text-slate-900'>{value}</div>
		</div>
	);
}

function yn(val, t) {
	if (val === 'yes') return t('reports.yes');
	if (val === 'no') return t('reports.no');
	return val ?? '—';
}
