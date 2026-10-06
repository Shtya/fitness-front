'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import qs from 'qs';
import { AnimatePresence, motion } from 'framer-motion';
import {
	AlertCircle, ArrowDownWideNarrow, ArrowUpNarrowWide, BellRing, CheckCircle2, ChevronDown, ClipboardCheck, Clock, Eye, FileText, Filter,
	FolderPlus, Layers, Loader2, MessageCircle, MessageSquare, Phone, RotateCcw, Save, Settings2, SlidersHorizontal, Users,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import api from '@/utils/axios';
import DataTable from '@/components/atoms/Datatable';
import FloatingSelect from '@/components/atoms/FloatingSelect';
import Badge from '@/components/atoms/GmBadge';
import GmRowActions from '@/components/atoms/GmRowActions';
import { Avatar, ErrorBox } from '@/components/atoms/GmStates';
import GmStatCard from '@/components/molecules/GmStatCard';
import { Modal } from '@/components/dashboard/ui/UI';
import { Notification } from '@/config/Notification';
import useDebounced from '@/hooks/useDebounced';
import { useUser } from '@/hooks/useUser';
import ReportFieldsBuilder from '@/components/pages/dashboard/reports/ReportFieldsBuilder';
import ReportNotifications from '@/components/pages/dashboard/reports/ReportNotifications';
import ReportDetail, { ReportDetailSkeleton, formatDate } from '@/components/pages/dashboard/reports/ReportDetail';
import {
	buildDefaultConfig, configSignature, countActiveQuestions, createConfigActions, newCustomGroup, normalizeConfig,
} from '@/components/pages/dashboard/reports/reportConfigModel';
import { IntakeHero, IntakeToolbar } from '@/components/pages/dashboard/intake/IntakeChrome';

const TABS = [
	{ id: 'fields', icon: Settings2, labelKey: 'coachConfig.tabs.fields' },
	{ id: 'notifications', icon: BellRing, labelKey: 'coachConfig.tabs.notifications' },
	{ id: 'reports', icon: FileText, labelKey: 'reports.title' },
	{ id: 'clients', icon: Users, labelKey: 'coachConfig.tabs.clients' },
];
const TAB_IDS = TABS.map(tab => tab.id);
const PER_PAGE_OPTIONS = [10, 20, 30, 50];
const CLIENT_STATUSES = ['', 'submitted', 'pending', 'late'];
const STATUS_BADGE = { submitted: 'green', pending: 'amber', late: 'red' };
const STATUS_LABEL = { submitted: 'coachConfig.clients.statusSubmitted', pending: 'coachConfig.clients.statusPending', late: 'coachConfig.clients.statusLate' };
const serverMessage = e => {
	const msg = e?.response?.data?.message;
	return Array.isArray(msg) ? msg.join(', ') : msg;
};
const phoneDigits = phone => String(phone || '').replace(/\D/g, '');

export default function WeeklyReportsPage() {
	const t = useTranslations('reportConfig');
	const locale = useLocale();
	const user = useUser();
	const role = String(user?.role || '').toLowerCase();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const errorOf = useCallback((e, fallbackKey) => (e?.response ? serverMessage(e) || t(fallbackKey) : t('common.serverUnreachable')), [t]);

	useEffect(() => {
		document.documentElement.dataset.gmUsers = '1';
		return () => { delete document.documentElement.dataset.gmUsers; };
	}, []);

	/* ── Tabs (synced with ?tab=) ── */
	const urlTab = searchParams.get('tab');
	const activeTab = TAB_IDS.includes(urlTab) ? urlTab : 'fields';
	const setTab = useCallback(id => {
		const sp = new URLSearchParams(searchParams.toString());
		if (id === 'fields') sp.delete('tab');
		else sp.set('tab', id);
		const q = sp.toString();
		router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
	}, [searchParams, router, pathname]);

	/* ── Config ── */
	const defaults = useMemo(() => ({
		initialMessage: t('coachConfig.notif.defaultInitialMessage'),
		reminderMessage: t('coachConfig.notif.defaultReminderMessage'),
	}), [t]);

	const [config, setConfig] = useState(null);
	const [savedSig, setSavedSig] = useState('');
	const [configLoading, setConfigLoading] = useState(true);
	const [configErr, setConfigErr] = useState(null);
	const [saving, setSaving] = useState(false);
	const [focusGroupId, setFocusGroupId] = useState(null);
	const actions = useMemo(() => createConfigActions(setConfig), []);

	const loadConfig = useCallback(async () => {
		setConfigLoading(true);
		setConfigErr(null);
		try {
			const { data } = await api.get('/coach/report-config');
			const next = normalizeConfig(data, buildDefaultConfig(defaults));
			setConfig(next);
			setSavedSig(configSignature(next));
		} catch (e) {
			setConfigErr(errorOf(e, 'coachConfig.errors.loadFailed'));
		} finally {
			setConfigLoading(false);
		}
	}, [defaults, errorOf]);

	useEffect(() => { if (role) loadConfig(); }, [role, loadConfig]);

	const isDirty = useMemo(() => Boolean(config) && configSignature(config) !== savedSig, [config, savedSig]);

	useEffect(() => {
		if (!isDirty) return undefined;
		const onBeforeUnload = e => { e.preventDefault(); e.returnValue = ''; };
		window.addEventListener('beforeunload', onBeforeUnload);
		return () => window.removeEventListener('beforeunload', onBeforeUnload);
	}, [isDirty]);

	const handleSave = useCallback(async () => {
		if (!config || saving) return;
		const snapshot = configSignature(config);
		setSaving(true);
		try {
			await api.put('/coach/report-config', config);
			setSavedSig(snapshot);
			Notification(t('coachConfig.savedSuccess'), 'success');
		} catch (e) {
			Notification(errorOf(e, 'coachConfig.errors.saveFailed'), 'error');
		} finally {
			setSaving(false);
		}
	}, [config, saving, t, errorOf]);

	const handleDiscard = useCallback(() => { if (savedSig) setConfig(JSON.parse(savedSig)); }, [savedSig]);

	const addGroup = useCallback(() => {
		const group = newCustomGroup(t('coachConfig.groups.newGroupDefaultLabel'));
		actions.addGroup(group);
		setFocusGroupId(group.id);
		if (activeTab !== 'fields') setTab('fields');
	}, [actions, t, activeTab, setTab]);

	const activeQuestions = useMemo(() => (config ? countActiveQuestions(config) : 0), [config]);
	const visibleGroups = useMemo(() => {
		if (!config) return { on: 0, total: 0 };
		const list = config.groupOrder.map(id => config.sections[id] || config.customGroups.find(g => g.id === id)).filter(Boolean);
		return { on: list.filter(g => g.enabled !== false).length, total: list.length };
	}, [config]);

	/* ── Reports ── */
	const [reports, setReports] = useState([]);
	const [rptTotal, setRptTotal] = useState(0);
	const [rptStats, setRptStats] = useState(null);
	const [rptLoading, setRptLoading] = useState(true);
	const [rptErr, setRptErr] = useState(null);
	const [rptPage, setRptPage] = useState(1);
	const [rptLimit, setRptLimit] = useState(10);
	const [rptSortBy, setRptSortBy] = useState('created_at');
	const [rptSortOrder, setRptSortOrder] = useState('DESC');
	const [rptSearch, setRptSearch] = useState('');
	const rptSearchDb = useDebounced(rptSearch, 350);
	const [rptReviewed, setRptReviewed] = useState('');
	const [rptUserId, setRptUserId] = useState('');
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [userOptions, setUserOptions] = useState([]);
	const usersRequested = useRef(false);
	const rptReq = useRef(0);
	const rptAbort = useRef(null);

	const fetchReports = useCallback(async () => {
		if (!role) return;
		rptAbort.current?.abort();
		const ctrl = new AbortController();
		rptAbort.current = ctrl;
		const myId = ++rptReq.current;
		setRptLoading(true);
		setRptErr(null);
		try {
			const filters = {};
			if (rptUserId) filters.userId = rptUserId;
			if (rptReviewed) filters.reviewed = rptReviewed;
			const params = { page: rptPage, limit: rptLimit, sortBy: rptSortBy, sortOrder: rptSortOrder, filters };
			const q = rptSearchDb.trim();
			if (q) params.search = q;
			const { data } = await api.get('/weekly-reports', {
				params,
				signal: ctrl.signal,
				paramsSerializer: p => qs.stringify(p, { encode: true, arrayFormat: 'indices', skipNulls: true }),
			});
			if (myId !== rptReq.current) return;
			setReports(Array.isArray(data?.records) ? data.records : []);
			setRptTotal(Number(data?.total_records || 0));
			setRptStats(data?.stats || null);
		} catch (e) {
			if (e?.name === 'CanceledError' || myId !== rptReq.current) return;
			setReports([]);
			setRptTotal(0);
			setRptErr(errorOf(e, 'reports.errors.load'));
		} finally {
			if (myId === rptReq.current) setRptLoading(false);
		}
	}, [role, rptPage, rptLimit, rptSortBy, rptSortOrder, rptSearchDb, rptUserId, rptReviewed, errorOf]);

	useEffect(() => { fetchReports(); }, [fetchReports]);
	useEffect(() => () => rptAbort.current?.abort(), []);

	const loadUserOptions = useCallback(async () => {
		if (usersRequested.current || !user?.id || (role !== 'admin' && role !== 'coach')) return;
		usersRequested.current = true;
		try {
			const route = role === 'admin' ? `/auth/admin/${user.id}/clients` : `/auth/coach/${user.id}/clients`;
			const { data } = await api.get(route, { params: { page: 1, limit: 200 } });
			setUserOptions((data?.items || []).map(i => ({ id: i.id, label: i.name || i.email })));
		} catch (e) {
			usersRequested.current = false;
			Notification(errorOf(e, 'reports.errors.loadUsers'), 'error');
		}
	}, [user?.id, role, errorOf]);

	const toggleFilters = useCallback(() => {
		setFiltersOpen(v => !v);
		loadUserOptions();
	}, [loadUserOptions]);

	const rptFilterCount = (rptUserId ? 1 : 0) + (rptReviewed ? 1 : 0) + (rptSortBy !== 'created_at' ? 1 : 0);
	const clearRptFilters = useCallback(() => {
		setRptSearch('');
		setRptUserId('');
		setRptReviewed('');
		setRptSortBy('created_at');
		setRptSortOrder('DESC');
		setRptPage(1);
	}, []);

	const onRptPageChange = useCallback(({ page: nextPage, per_page }) => {
		const nextLimit = Number(per_page || rptLimit);
		if (nextLimit !== rptLimit) { setRptLimit(nextLimit); setRptPage(1); }
		else setRptPage(Number(nextPage || 1));
	}, [rptLimit]);

	/* ── Report detail ── */
	const [detail, setDetail] = useState(null);
	const [detailLoading, setDetailLoading] = useState(false);
	const [detailErr, setDetailErr] = useState(null);
	const [fbSaving, setFbSaving] = useState(false);
	const detailReq = useRef(0);

	const loadDetail = useCallback(async id => {
		const myId = ++detailReq.current;
		setDetailLoading(true);
		setDetailErr(null);
		try {
			const { data } = await api.get(`/weekly-reports/${id}`);
			if (myId === detailReq.current) setDetail(data || null);
		} catch (e) {
			if (myId === detailReq.current) setDetailErr(errorOf(e, 'reports.detail.loadFailed'));
		} finally {
			if (myId === detailReq.current) setDetailLoading(false);
		}
	}, [errorOf]);

	const [detailId, setDetailId] = useState(null);
	const openDetail = useCallback(row => {
		setDetailId(row.id);
		setDetail(row);
		loadDetail(row.id);
	}, [loadDetail]);
	const closeDetail = useCallback(() => {
		if (fbSaving) return;
		detailReq.current++;
		setDetailId(null);
		setDetail(null);
		setDetailErr(null);
	}, [fbSaving]);

	const saveFeedback = useCallback(async coachFeedback => {
		if (!detailId) return;
		setFbSaving(true);
		try {
			await api.put(`/weekly-reports/${detailId}/feedback`, { coachFeedback });
			Notification(t('reports.messages.reviewedSaved'), 'success');
			detailReq.current++;
			setDetailId(null);
			setDetail(null);
			fetchReports();
		} catch (e) {
			throw new Error(errorOf(e, 'reports.errors.save'));
		} finally {
			setFbSaving(false);
		}
	}, [detailId, t, errorOf, fetchReports]);

	/* ── Clients ── */
	const [clients, setClients] = useState([]);
	const [cliTotal, setCliTotal] = useState(0);
	const [cliStats, setCliStats] = useState(null);
	const [cliLoading, setCliLoading] = useState(false);
	const [cliErr, setCliErr] = useState(null);
	const [cliPage, setCliPage] = useState(1);
	const [cliLimit, setCliLimit] = useState(10);
	const [cliSearch, setCliSearch] = useState('');
	const cliSearchDb = useDebounced(cliSearch, 350);
	const [cliStatus, setCliStatus] = useState('');
	const [remindingIds, setRemindingIds] = useState(() => new Set());
	const cliReq = useRef(0);
	const cliAbort = useRef(null);

	const fetchClients = useCallback(async () => {
		if (!role) return;
		cliAbort.current?.abort();
		const ctrl = new AbortController();
		cliAbort.current = ctrl;
		const myId = ++cliReq.current;
		setCliLoading(true);
		setCliErr(null);
		try {
			const { data } = await api.get('/coach/clients/report-status', {
				params: { page: cliPage, limit: cliLimit, search: cliSearchDb.trim(), status: cliStatus },
				signal: ctrl.signal,
			});
			if (myId !== cliReq.current) return;
			setClients(Array.isArray(data?.items) ? data.items : []);
			setCliTotal(Number(data?.total || 0));
			setCliStats(data?.stats || null);
		} catch (e) {
			if (e?.name === 'CanceledError' || myId !== cliReq.current) return;
			setClients([]);
			setCliTotal(0);
			setCliErr(errorOf(e, 'coachConfig.clients.loadFailed'));
		} finally {
			if (myId === cliReq.current) setCliLoading(false);
		}
	}, [role, cliPage, cliLimit, cliSearchDb, cliStatus, errorOf]);

	useEffect(() => { if (activeTab === 'clients') fetchClients(); }, [activeTab, fetchClients]);
	useEffect(() => () => cliAbort.current?.abort(), []);

	const onCliPageChange = useCallback(({ page: nextPage, per_page }) => {
		const nextLimit = Number(per_page || cliLimit);
		if (nextLimit !== cliLimit) { setCliLimit(nextLimit); setCliPage(1); }
		else setCliPage(Number(nextPage || 1));
	}, [cliLimit]);

	const sendReminders = useCallback(async ids => {
		if (!ids?.length) return;
		setRemindingIds(prev => new Set([...prev, ...ids]));
		try {
			const { data } = await api.post('/coach/report-reminder', { clientIds: ids });
			const sent = Number(data?.sent ?? 0);
			if (sent > 0) Notification(t('coachConfig.clients.reminderSentCount', { count: sent }), 'success');
			else Notification(t('coachConfig.clients.reminderNone'), 'error');
			if (ids.length > 1) fetchClients();
		} catch (e) {
			Notification(errorOf(e, 'coachConfig.clients.reminderFailed'), 'error');
		} finally {
			setRemindingIds(prev => {
				const next = new Set(prev);
				ids.forEach(id => next.delete(id));
				return next;
			});
		}
	}, [t, errorOf, fetchClients]);

	const requestReportWhatsApp = useCallback(client => {
		const phone = phoneDigits(client.phone);
		if (!phone) { Notification(t('coachConfig.clients.noPhone'), 'error'); return; }
		const text = String(config?.notifications?.initialMessage || '').trim() || defaults.initialMessage;
		window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
	}, [config?.notifications?.initialMessage, defaults.initialMessage, t]);

	/* ── Stats ── */
	const statCards = useMemo(() => {
		const tone = {
			primary: { tone: 'gm-chip', stroke: 'var(--color-primary-500)', fill: 'var(--color-primary-400)' },
			secondary: { tone: 'gm-chip-secondary', stroke: 'var(--color-secondary-500)', fill: 'var(--color-secondary-400)' },
			ok: { tone: 'gm-chip-ok', stroke: 'var(--gm-ok)', fill: 'var(--gm-ok)' },
			warn: { tone: 'gm-chip-warn', stroke: 'var(--gm-warn)', fill: 'var(--gm-warn)' },
		};
		const rTotal = Number(rptStats?.total || 0);
		const reviewed = Number(rptStats?.reviewed || 0);
		const unreviewed = Number(rptStats?.unreviewed || 0);

		if (activeTab === 'clients') {
			const total = Number(cliStats?.total || 0);
			return [
				{ key: 'c-total', title: t('coachConfig.clients.total'), value: total, icon: Users, hint: t('stats.clientsHint'), ...tone.primary, seed: 0.4, max: total },
				{ key: 'c-sub', title: t('coachConfig.clients.submitted'), value: Number(cliStats?.submitted || 0), icon: CheckCircle2, hint: t('stats.submittedHint'), ...tone.ok, seed: 0.9, max: total },
				{ key: 'c-pend', title: t('coachConfig.clients.pending'), value: Number(cliStats?.pending || 0), icon: Clock, hint: t('stats.pendingHint'), ...tone.warn, seed: 1.4, max: total },
				{ key: 'c-late', title: t('coachConfig.clients.late'), value: Number(cliStats?.late || 0), icon: AlertCircle, hint: t('stats.lateHint'), ...tone.secondary, seed: 1.9, max: total },
			];
		}
		if (activeTab === 'reports') {
			return [
				{ key: 'r-total', title: t('reports.labels.total'), value: rTotal, icon: FileText, hint: t('stats.reportsHint'), ...tone.primary, seed: 0.4, max: rTotal },
				{ key: 'r-rev', title: t('reports.reviewed'), value: reviewed, icon: CheckCircle2, hint: t('stats.reviewedHint'), ...tone.ok, seed: 0.9, max: rTotal },
				{ key: 'r-wait', title: t('reports.awaitingReview'), value: unreviewed, icon: Clock, hint: t('stats.awaitingHint'), ...tone.warn, seed: 1.4, max: rTotal },
				{ key: 'r-shown', title: t('stats.matching'), value: rptTotal, icon: Filter, hint: t('stats.matchingHint'), ...tone.secondary, seed: 1.9, max: rTotal },
			];
		}
		return [
			{ key: 'q-active', title: t('stats.activeQuestions'), value: activeQuestions, icon: Settings2, hint: t('stats.activeQuestionsHint'), ...tone.primary, seed: 0.4 },
			{ key: 'q-groups', title: t('stats.visibleGroups'), value: visibleGroups.on, icon: Layers, hint: t('stats.visibleGroupsHint', { total: visibleGroups.total }), ...tone.secondary, seed: 0.9, max: visibleGroups.total },
			{ key: 'q-reports', title: t('reports.labels.total'), value: rTotal, icon: FileText, hint: t('stats.reportsHint'), ...tone.ok, seed: 1.4, max: rTotal },
			{ key: 'q-wait', title: t('reports.awaitingReview'), value: unreviewed, icon: Clock, hint: t('stats.awaitingHint'), ...tone.warn, seed: 1.9, max: rTotal },
		];
	}, [activeTab, t, rptStats, rptTotal, cliStats, activeQuestions, visibleGroups]);

	/* ── Columns ── */
	const reportColumns = useMemo(() => [
		{
			key: 'athlete',
			header: t('reports.columns.athlete'),
			headClassName: 'min-w-[220px]',
			className: 'gm-wrap',
			cell: row => {
				const name = row?.user?.name || row?.user?.email || t('reports.athlete');
				return (
					<button type='button' onClick={() => openDetail(row)} className='flex w-full min-w-0 items-center gap-3 text-start'>
						<Avatar name={name} />
						<span className='min-w-0'>
							<span dir='auto' className='block truncate text-[13px] font-bold gm-ink'>{name}</span>
							{row?.user?.name && row?.user?.email && <span className='block truncate font-en text-[11.5px] gm-muted'>{row.user.email}</span>}
						</span>
					</button>
				);
			},
		},
		{
			key: 'weekOf',
			header: t('reports.columns.weekOf'),
			cell: row => <span className='whitespace-nowrap font-en text-[12.5px] tabular-nums gm-ink-soft'>{formatDate(row?.weekOf, locale)}</span>,
		},
		{
			key: 'submitted',
			header: t('reports.detail.submittedAt'),
			cell: row => <span className='whitespace-nowrap font-en text-[12.5px] tabular-nums gm-muted'>{formatDate(row?.created_at, locale)}</span>,
		},
		{
			key: 'status',
			header: t('reports.statusReview'),
			cell: row => (row?.reviewedAt
				? <Badge color='green' icon={<CheckCircle2 className='size-3' />}>{t('reports.reviewed')}</Badge>
				: <Badge color='amber' dot>{t('reports.awaitingReview')}</Badge>),
		},
		{
			key: 'weight',
			header: t('reports.card.weight'),
			cell: row => {
				const w = row?.measurements?.weight;
				return <span className='font-en text-[12.5px] font-semibold tabular-nums gm-ink-soft'>{w != null ? `${w} ${t('reports.card.kg')}` : '—'}</span>;
			},
		},
		{
			key: 'cardio',
			header: t('reports.card.cardio'),
			cell: row => {
				const c = row?.training?.cardioAdherence;
				return <span className='font-en text-[12.5px] font-semibold tabular-nums gm-ink-soft'>{c != null ? `${c} / 5` : '—'}</span>;
			},
		},
		{
			key: 'actions',
			header: t('common.actions'),
			headClassName: 'gm-col-end',
			className: 'gm-col-end',
			cell: row => <GmRowActions options={[{ icon: Eye, tone: 'primary', label: t('reports.view'), onClick: () => openDetail(row) }]} />,
		},
	], [t, locale, openDetail]);

	const clientColumns = useMemo(() => [
		{
			key: 'client',
			header: t('coachConfig.clients.name'),
			headClassName: 'min-w-[220px]',
			className: 'gm-wrap',
			cell: row => (
				<div className='flex min-w-0 items-center gap-3'>
					<Avatar name={row.name} />
					<span className='min-w-0'>
						<span dir='auto' className='block truncate text-[13px] font-bold gm-ink'>{row.name || '—'}</span>
						<span className='block truncate font-en text-[11.5px] gm-muted'>{row.email || '—'}</span>
					</span>
				</div>
			),
		},
		{
			key: 'phone',
			header: t('coachConfig.clients.phone'),
			cell: row => (row.phone
				? <span dir='ltr' className='font-en text-[12.5px] tabular-nums gm-ink-soft'>{row.phone}</span>
				: <span className='text-[12px] gm-faint'>{t('coachConfig.clients.noPhoneShort')}</span>),
		},
		{
			key: 'status',
			header: t('coachConfig.clients.status'),
			cell: row => <Badge color={STATUS_BADGE[row.status] || 'slate'} dot>{t(STATUS_LABEL[row.status] || STATUS_LABEL.pending)}</Badge>,
		},
		{
			key: 'lastReport',
			header: t('coachConfig.clients.lastReport'),
			cell: row => (row.lastReportAt
				? <span className='whitespace-nowrap font-en text-[12.5px] tabular-nums gm-muted'>{formatDate(row.lastReportAt, locale)}</span>
				: <span className='text-[12px] gm-faint'>{t('coachConfig.clients.never')}</span>),
		},
		{
			key: 'actions',
			header: t('common.actions'),
			headClassName: 'gm-col-end',
			className: 'gm-col-end',
			cell: row => {
				const pending = row.status !== 'submitted';
				const hasPhone = Boolean(phoneDigits(row.phone));
				const reminding = remindingIds.has(row.id);
				return (
					<GmRowActions
						options={[
							{ icon: MessageCircle, tone: 'cyan', label: t('coachConfig.clients.requestReport'), hide: !pending || !hasPhone, onClick: () => requestReportWhatsApp(row) },
							{ icon: reminding ? Loader2 : BellRing, tone: 'amber', label: t('coachConfig.clients.sendReminder'), hide: !pending, loading: reminding, onClick: () => sendReminders([row.id]) },
							{ icon: Phone, tone: 'slate', label: t('coachConfig.clients.call'), hide: !hasPhone, onClick: () => window.open(`tel:${row.phone}`, '_self') },
							{ icon: MessageSquare, tone: 'violet', label: t('coachConfig.clients.chat'), onClick: () => window.open(`/${locale}/dashboard/chat?userId=${row.id}`, '_blank', 'noopener') },
							{ icon: Eye, tone: 'primary', label: t('coachConfig.clients.profile'), onClick: () => window.open(`/${locale}/dashboard/users/${row.id}`, '_blank', 'noopener') },
						]}
					/>
				);
			},
		},
	], [t, locale, remindingIds, requestReportWhatsApp, sendReminders]);

	const bulkReminding = remindingIds.size > 1;
	const clientBulkActions = useMemo(() => [{
		key: 'remind',
		label: t('coachConfig.clients.sendReminder'),
		icon: <BellRing />,
		variant: 'amber',
		loading: bulkReminding,
		confirm: { message: count => t('coachConfig.clients.confirmBulkReminder', { count }) },
		onClick: ids => sendReminders(ids),
	}], [t, bulkReminding, sendReminders]);

	const SortIcon = rptSortOrder === 'DESC' ? ArrowDownWideNarrow : ArrowUpNarrowWide;
	const reportOptions = useMemo(() => ({
		users: [{ id: '', label: t('reports.filters.allUsers') }, ...userOptions],
		reviewed: [
			{ id: '', label: t('reports.filters.reviewed.any') },
			{ id: 'true', label: t('reports.filters.reviewed.yes') },
			{ id: 'false', label: t('reports.filters.reviewed.no') },
		],
		sortBy: ['created_at', 'updated_at', 'weekOf'].map(id => ({ id, label: t(`reports.sort.fields.${id}`) })),
	}), [t, userOptions]);

	const unreviewedBadge = Number(rptStats?.unreviewed || 0);
	const isConfigTab = activeTab === 'fields' || activeTab === 'notifications';

	const rptQuery = rptSearch.trim();
	const cliQuery = cliSearch.trim();
	const reportChips = [
		rptQuery && { key: 'q', label: t('roster.searchLabel'), value: `“${rptQuery}”`, onRemove: () => { setRptSearch(''); setRptPage(1); } },
		rptUserId && { key: 'user', label: t('reports.filters.user'), value: userOptions.find(u => u.id === rptUserId)?.label || rptUserId, onRemove: () => { setRptUserId(''); setRptPage(1); } },
		rptReviewed && { key: 'reviewed', label: t('reports.filters.reviewed.label'), value: reportOptions.reviewed.find(o => o.id === rptReviewed)?.label, onRemove: () => { setRptReviewed(''); setRptPage(1); } },
		rptSortBy !== 'created_at' && { key: 'sort', label: t('reports.filters.sortBy'), value: reportOptions.sortBy.find(o => o.id === rptSortBy)?.label, onRemove: () => { setRptSortBy('created_at'); setRptPage(1); } },
		rptSortOrder !== 'DESC' && { key: 'order', label: t('reports.filters.sortBy'), value: t('reports.sort.orders.asc'), onRemove: () => { setRptSortOrder('DESC'); setRptPage(1); } },
	].filter(Boolean);
	const clientChips = [
		cliQuery && { key: 'q', label: t('roster.searchLabel'), value: `“${cliQuery}”`, onRemove: () => { setCliSearch(''); setCliPage(1); } },
		cliStatus && { key: 'status', label: t('coachConfig.clients.status'), value: t(STATUS_LABEL[cliStatus]), onRemove: () => { setCliStatus(''); setCliPage(1); } },
	].filter(Boolean);

	return (
		<div className='gm-surface rs-scope app-stack pb-28'>
			<div className='rs-summary'>
				<IntakeHero
					icon={ClipboardCheck}
					title={t('ui.title')}
					subtitle={t('ui.subtitle')}
					ctaLabel={activeTab === 'fields' && config ? (
						<>
							<FolderPlus className='size-4' strokeWidth={2} aria-hidden />
							<span>{t('coachConfig.groups.addGroup')}</span>
						</>
					) : null}
					onCta={activeTab === 'fields' && config ? addGroup : undefined}
				/>
				<section className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
					{statCards.map((card, index) => <GmStatCard key={card.key} card={card} index={index} />)}
				</section>
			</div>

			<div role='tablist' aria-label={t('ui.title')} className='rs-seg' style={{ flexWrap: 'wrap', height: 'auto' }}>
				{TABS.map(tab => {
					const on = tab.id === activeTab;
					const Icon = tab.icon;
					return (
						<button
							key={tab.id}
							type='button'
							role='tab'
							aria-selected={on}
							onClick={() => setTab(tab.id)}
							className={`rs-seg__btn${on ? ' is-on' : ''}`}
						>
							{on && (
								<motion.span
									layoutId='reports-tab-pill'
									className='rs-seg__pill'
									transition={{ type: 'spring', stiffness: 520, damping: 38 }}
								/>
							)}
							<Icon className='size-3.5' strokeWidth={2} aria-hidden />
							<span>{t(tab.labelKey)}</span>
							{tab.id === 'reports' && unreviewedBadge > 0 && (
								<span className='rs-btn__count'>{unreviewedBadge > 99 ? '99+' : unreviewedBadge}</span>
							)}
						</button>
					);
				})}
			</div>

			{isConfigTab && (
				configLoading && !config ? (
					<div className='space-y-4'>
						{[0, 1, 2].map(i => <span key={i} className='gm-skel block h-36 rounded-[20px]!' />)}
					</div>
				) : configErr && !config ? (
					<ErrorBox message={configErr} onRetry={loadConfig} retryLabel={t('common.retry')} busy={configLoading} />
				) : config ? (
					activeTab === 'fields'
						? <ReportFieldsBuilder config={config} actions={actions} focusGroupId={focusGroupId} onAddGroup={addGroup} />
						: <ReportNotifications notifications={config.notifications} defaults={defaults} onChange={actions.setNotif} />
				) : null
			)}

			{activeTab === 'reports' && (
				<DataTable
					className='gm-table'
					hideToolbar
					toolbar={(
						<div className='space-y-4'>
							<IntakeToolbar
								search={rptSearch}
								onSearch={v => { setRptSearch(v); setRptPage(1); }}
								searching={rptSearch.trim() !== rptSearchDb}
								searchPlaceholder={t('reports.searchPlaceholder')}
								searchLabel={t('roster.searchLabel')}
								clearSearchLabel={t('roster.clearAll')}
								actions={(
									<>
										<button
											type='button'
											onClick={() => { setRptSortOrder(o => (o === 'DESC' ? 'ASC' : 'DESC')); setRptPage(1); }}
											className={`rs-btn${rptSortOrder === 'ASC' ? ' is-on' : ''}`}
											aria-pressed={rptSortOrder === 'ASC'}
										>
											<SortIcon className='size-4' strokeWidth={2} aria-hidden />
											<span>{rptSortOrder === 'DESC' ? t('reports.sort.orders.desc') : t('reports.sort.orders.asc')}</span>
										</button>
										<button
											type='button'
											onClick={toggleFilters}
											aria-expanded={filtersOpen}
											className={`rs-btn${filtersOpen || rptFilterCount > 0 ? ' is-on' : ''}`}
										>
											<SlidersHorizontal className='size-4' strokeWidth={2} aria-hidden />
											<span>{t('reports.filters.title')}</span>
											{rptFilterCount > 0 && <span className='rs-btn__count'>{rptFilterCount}</span>}
											<ChevronDown className={`rs-btn__chev size-3.5${filtersOpen ? ' rotate-180' : ''}`} strokeWidth={2.2} aria-hidden />
										</button>
									</>
								)}
								result={t.rich('roster.resultCount', {
									count: rptTotal,
									strong: (chunks) => <strong>{chunks}</strong>,
								})}
								chips={reportChips}
								onClearAll={clearRptFilters}
								clearAllLabel={t('roster.clearAll')}
								activeFiltersLabel={t('roster.activeFilters')}
							/>
							<AnimatePresence initial={false}>
								{filtersOpen && (
									<motion.div
										initial={{ opacity: 0, y: -6 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -6 }}
										transition={{ duration: 0.22, ease: [0.2, 0.75, 0.25, 1] }}
										className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'
									>
										<FloatingSelect
											searchable
											label={t('reports.filters.user')}
											createPlaceholder={t('reports.filters.userPlaceholder')}
											options={reportOptions.users}
											value={rptUserId}
											onChange={id => { setRptUserId(id || ''); setRptPage(1); }}
										/>
										<FloatingSelect
											label={t('reports.filters.reviewed.label')}
											options={reportOptions.reviewed}
											value={rptReviewed}
											onChange={id => { setRptReviewed(id || ''); setRptPage(1); }}
										/>
										<FloatingSelect
											label={t('reports.filters.sortBy')}
											options={reportOptions.sortBy}
											value={rptSortBy}
											onChange={id => { setRptSortBy(id || 'created_at'); setRptPage(1); }}
										/>
									</motion.div>
								)}
							</AnimatePresence>
							{rptErr && <ErrorBox message={rptErr} onRetry={fetchReports} retryLabel={t('common.retry')} busy={rptLoading} />}
						</div>
					)}
					compact
					columns={reportColumns}
					data={reports}
					isLoading={rptLoading}
					rowKey={row => row.id}
					labels={{
						emptyTitle: rptErr ? t('reports.errors.load') : rptSearch || rptFilterCount ? t('reports.emptyFiltered') : t('reports.empty'),
						emptySubtitle: rptErr ? t('common.retryHint') : rptSearch || rptFilterCount ? t('roster.emptyHint') : t('reports.subtitle'),
					}}
					pagination={{ current_page: rptPage, per_page: rptLimit, total_records: rptTotal }}
					onPageChange={onRptPageChange}
					perPageOptions={PER_PAGE_OPTIONS}
					hoverable
				/>
			)}

			{activeTab === 'clients' && (
				<DataTable
					className='gm-table'
					hideToolbar
					toolbar={(
						<div className='space-y-3'>
							<IntakeToolbar
								search={cliSearch}
								onSearch={v => { setCliSearch(v); setCliPage(1); }}
								searching={cliSearch.trim() !== cliSearchDb}
								searchPlaceholder={t('coachConfig.clients.search')}
								searchLabel={t('roster.searchLabel')}
								clearSearchLabel={t('roster.clearAll')}
								segments={CLIENT_STATUSES.map(s => {
									const count = s ? cliStats?.[s] : cliStats?.total;
									const label = s ? t(STATUS_LABEL[s]) : t('coachConfig.clients.statusAll');
									return {
										id: s || 'all',
										name: (
											<>
												<span>{label}</span>
												{count != null && <span className='rs-btn__count'>{count}</span>}
											</>
										),
									};
								})}
								segment={cliStatus || 'all'}
								onSegment={id => { setCliStatus(id === 'all' ? '' : id); setCliPage(1); }}
								segmentLabel={t('coachConfig.clients.status')}
								layoutId='report-clients-seg'
								result={t.rich('roster.resultCount', {
									count: cliTotal,
									strong: (chunks) => <strong>{chunks}</strong>,
								})}
								chips={clientChips}
								onClearAll={() => { setCliSearch(''); setCliStatus(''); setCliPage(1); }}
								clearAllLabel={t('roster.clearAll')}
								activeFiltersLabel={t('roster.activeFilters')}
							/>
							{cliErr && <ErrorBox message={cliErr} onRetry={fetchClients} retryLabel={t('common.retry')} busy={cliLoading} />}
						</div>
					)}
					compact
					columns={clientColumns}
					data={clients}
					isLoading={cliLoading}
					rowKey={row => row.id}
					labels={{
						emptyTitle: cliErr ? t('coachConfig.clients.loadFailed') : cliSearch || cliStatus ? t('coachConfig.clients.noResults') : t('coachConfig.clients.empty'),
						emptySubtitle: cliErr ? t('common.retryHint') : cliSearch || cliStatus ? t('roster.emptyHint') : t('coachConfig.clients.subtitle'),
						selectedCount: t.raw('coachConfig.clients.selectedCount'),
						clearSelection: t('coachConfig.clients.deselectAll'),
					}}
					pagination={{ current_page: cliPage, per_page: cliLimit, total_records: cliTotal }}
					onPageChange={onCliPageChange}
					perPageOptions={PER_PAGE_OPTIONS}
					hoverable
					selectable
					bulkActions={clientBulkActions}
				/>
			)}

			<Modal cn='gm-modal-root' panelClassName='gm-modal' open={!!detailId} onClose={closeDetail} title={t('reports.detail.title')} maxW='max-w-5xl'>
				{detailErr ? (
					<ErrorBox message={detailErr} onRetry={() => loadDetail(detailId)} retryLabel={t('common.retry')} busy={detailLoading} />
				) : detailLoading && !detail?.photos ? (
					<ReportDetailSkeleton />
				) : detail ? (
					<ReportDetail report={detail} config={config} locale={locale} saving={fbSaving} onSaveFeedback={saveFeedback} onClose={closeDetail} />
				) : null}
			</Modal>

			<AnimatePresence>
				{isDirty && (
					<motion.div
						key='save-bar'
						initial={{ opacity: 0, y: 24, scale: 0.97 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 24, scale: 0.97 }}
						transition={{ type: 'spring', stiffness: 380, damping: 30 }}
						className='pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4'
					>
						<div
							role='region'
							aria-label={t('coachConfig.unsavedChanges')}
							className='gm-float pointer-events-auto flex w-full max-w-xl flex-wrap items-center gap-3 px-4 py-3'
						>
							<span className='relative grid size-9 shrink-0 place-items-center rounded-[11px] gm-chip-warn'>
								<Save className='size-4' />
							</span>
							<div className='min-w-0 flex-1'>
								<p className='text-[13px] font-bold gm-ink'>{t('coachConfig.unsavedChanges')}</p>
								<p className='truncate text-[11.5px] gm-muted'>{t('coachConfig.unsavedHint')}</p>
							</div>
							<div className='flex w-full items-center gap-2 sm:w-auto'>
								<button type='button' onClick={handleDiscard} disabled={saving} className='gm-btn-ghost gm-btn-compact inline-flex flex-1 items-center justify-center gap-1.5 disabled:opacity-60 sm:flex-none'>
									<RotateCcw className='size-3.5' />
									{t('common.discard')}
								</button>
								<button type='button' onClick={handleSave} disabled={saving} className='gm-btn-primary gm-btn-compact inline-flex flex-1 items-center justify-center gap-1.5 disabled:opacity-70 sm:flex-none'>
									{saving ? <Loader2 className='size-4 animate-spin' /> : <Save className='size-4' />}
									{t('coachConfig.save')}
								</button>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
