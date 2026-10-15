'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CalendarRange, Layers, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import api from '@/utils/axios';
import Badge from '@/components/atoms/GmBadge';
import GmRowActions from '@/components/atoms/GmRowActions';
import DataTable from '@/components/atoms/Datatable';
import useDebounced from '@/hooks/useDebounced';
import { IntakeFilterPopover, IntakeOptionGroup, IntakeToolbar } from '@/components/pages/dashboard/intake/IntakeChrome';
import { PAYMENT_METHODS, addDays, apiError, formatDate, formatMoney, todayYmd } from './billing-utils';

const PER_PAGE_OPTIONS = [25, 50, 100];

function periodRange(period) {
	const today = todayYmd();
	const monthStart = `${today.slice(0, 8)}01`;
	if (period === 'thisMonth') return { dateFrom: monthStart, dateTo: today };
	if (period === 'lastMonth') {
		const lastEnd = addDays(monthStart, -1);
		return { dateFrom: `${lastEnd.slice(0, 8)}01`, dateTo: lastEnd };
	}
	return {};
}

const KNOWN_METHODS = new Set(['cash', 'bank_transfer', 'card', 'wallet', 'fawry', 'paymob', 'stripe', 'paypal', 'other']);

export default function PaymentsTab({ version, onDelete }) {
	const t = useTranslations('billing');
	const locale = useLocale();

	const [rows, setRows] = useState([]);
	const [total, setTotal] = useState(0);
	const [collected, setCollected] = useState(0);
	const [loading, setLoading] = useState(true);
	const [err, setErr] = useState(null);

	const [search, setSearch] = useState('');
	const debouncedSearch = useDebounced(search, 350);
	const [period, setPeriod] = useState('all');
	const [method, setMethod] = useState('all');
	const [page, setPage] = useState(1);
	const [perPage, setPerPage] = useState(25);
	const [filterOpen, setFilterOpen] = useState(false);
	const filterAnchorRef = useRef(null);

	const reqId = useRef(0);
	const abortRef = useRef(null);

	const fetchPayments = useCallback(async () => {
		abortRef.current?.abort();
		const ctrl = new AbortController();
		abortRef.current = ctrl;
		const myId = ++reqId.current;
		setLoading(true);
		setErr(null);
		try {
			const params = { page, limit: perPage, ...periodRange(period) };
			const q = debouncedSearch.trim();
			if (q) params.q = q;
			if (method !== 'all') params.method = method;
			const { data } = await api.get('/billing/payments', { params, signal: ctrl.signal });
			if (myId !== reqId.current) return;
			setRows(Array.isArray(data?.items) ? data.items : []);
			setTotal(Number(data?.meta?.total || 0));
			setCollected(Number(data?.summary?.collected || 0));
		} catch (e) {
			if (e?.name === 'CanceledError' || myId !== reqId.current) return;
			setRows([]);
			setTotal(0);
			setCollected(0);
			setErr(apiError(e, t('errors.load')));
		} finally {
			if (myId === reqId.current) setLoading(false);
		}
	}, [page, perPage, period, method, debouncedSearch, t]);

	useEffect(() => { fetchPayments(); }, [fetchPayments, version]);
	useEffect(() => () => abortRef.current?.abort(), []);

	// After a delete empties the last page, step back instead of showing an empty table.
	useEffect(() => {
		if (!loading && !rows.length && page > 1 && total > 0) setPage(p => p - 1);
	}, [loading, rows.length, page, total]);

	const onSearch = useCallback(v => { setSearch(v); setPage(1); }, []);
	const onPeriod = useCallback(v => { setPeriod(v); setPage(1); }, []);
	const onMethod = useCallback(v => { setMethod(v); setPage(1); }, []);

	const segments = useMemo(() => [
		{ id: 'all', name: t('payments.periodAll'), icon: Layers },
		{ id: 'thisMonth', name: t('payments.periodThisMonth'), icon: CalendarDays },
		{ id: 'lastMonth', name: t('payments.periodLastMonth'), icon: CalendarRange },
	], [t]);

	const methodOptions = useMemo(() => [
		{ id: 'all', name: t('payments.all'), icon: Layers },
		...PAYMENT_METHODS.map(m => ({ id: m.id, name: t(`methods.${m.id}`), icon: m.icon })),
	], [t]);

	const columns = useMemo(() => [
		{
			key: 'date',
			header: t('payments.date'),
			cell: row => <span className='whitespace-nowrap text-[12.5px] font-semibold gm-ink'>{formatDate(row.paidAt, locale)}</span>,
		},
		{
			key: 'client',
			header: t('payments.client'),
			headClassName: 'min-w-[180px]',
			cell: row => (
				<span className='flex min-w-0 flex-col'>
					<span dir='auto' className='truncate text-[13px] font-bold gm-ink'>{row.client?.name || '—'}</span>
					{row.client?.phone ? <span dir='ltr' className='truncate text-start font-en text-[11.5px] gm-muted'>{row.client.phone}</span> : null}
				</span>
			),
		},
		{
			key: 'for',
			header: t('payments.for'),
			headClassName: 'min-w-[180px]',
			className: 'max-w-[320px]',
			cell: row => {
				const title = row.planName || row.notes || row.description;
				return (
					<span className='flex min-w-0 flex-col'>
						<span dir='auto' className='truncate text-[12.5px] font-semibold gm-ink-soft'>{title || '—'}</span>
						{row.periodFrom && row.periodTo ? (
							<span className='truncate text-[11px] gm-muted'>
								{t('payments.period', { from: formatDate(row.periodFrom, locale), to: formatDate(row.periodTo, locale) })}
							</span>
						) : row.planName && row.notes ? (
							<span dir='auto' className='truncate text-[11px] gm-muted'>{row.notes}</span>
						) : null}
					</span>
				);
			},
		},
		{
			key: 'method',
			header: t('payments.method'),
			cell: row => <Badge color='slate'>{KNOWN_METHODS.has(row.method) ? t(`methods.${row.method}`) : row.method}</Badge>,
		},
		{
			key: 'amount',
			header: t('payments.amount'),
			headClassName: 'text-end!',
			className: 'text-end',
			cell: row => (
				<span className='inline-flex flex-col items-end'>
					<span dir='ltr' className='font-en text-[13.5px] font-bold tabular-nums gm-ink'>
						{formatMoney(row.amount)} <span className='text-[10.5px] font-semibold gm-faint'>{t('currency')}</span>
					</span>
					{row.status !== 'succeeded' ? <Badge color={row.status === 'failed' ? 'red' : 'amber'}>{t(`paymentStatus.${row.status}`)}</Badge> : null}
				</span>
			),
		},
		{
			key: 'actions',
			header: '',
			headClassName: 'gm-col-end',
			className: 'gm-col-end',
			cell: row => <GmRowActions options={[{ icon: Trash2, tone: 'danger', label: t('actions.delete'), onClick: () => onDelete(row) }]} />,
		},
	], [t, locale, onDelete]);

	const onPageChange = useCallback(({ page: nextPage, per_page }) => {
		const nextLimit = Number(per_page || perPage);
		if (nextLimit !== perPage) {
			setPerPage(nextLimit);
			setPage(1);
		} else {
			setPage(Number(nextPage || 1));
		}
	}, [perPage]);

	const chips = [
		method !== 'all' && { key: 'method', label: t('payments.method'), value: t(`methods.${method}`), onRemove: () => onMethod('all') },
	].filter(Boolean);
	const filteredOut = Boolean(search.trim()) || period !== 'all' || method !== 'all';

	return (
		<div className='space-y-3'>
			{err && (
				<div role='alert' className='flex flex-wrap items-center gap-2 rounded-[14px] border border-rose-200/70 bg-rose-50/80 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300'>
					<XCircle className='size-4 shrink-0' />
					<span className='min-w-0 flex-1'>{err}</span>
					<button type='button' onClick={fetchPayments} disabled={loading} className='gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5 disabled:opacity-60'>
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
						searching={search.trim() !== debouncedSearch.trim()}
						searchPlaceholder={t('payments.searchPlaceholder')}
						searchLabel={t('toolbar.search')}
						clearSearchLabel={t('toolbar.clearAll')}
						segments={segments}
						segment={period}
						onSegment={onPeriod}
						segmentLabel={t('payments.date')}
						layoutId='billing-payments-seg'
						filterLabel={t('toolbar.filters')}
						filterCount={method !== 'all' ? 1 : 0}
						filterOpen={filterOpen}
						onFilterToggle={() => setFilterOpen(v => !v)}
						filterAnchorRef={filterAnchorRef}
						result={t.rich('payments.resultCount', {
							count: total,
							total: `${formatMoney(collected)} ${t('currency')}`,
							strong: chunks => <strong>{chunks}</strong>,
						})}
						chips={chips}
						onClearAll={() => onMethod('all')}
						clearAllLabel={t('toolbar.clearAll')}
						activeFiltersLabel={t('toolbar.activeFilters')}
					>
						<IntakeFilterPopover
							open={filterOpen}
							anchorRef={filterAnchorRef}
							onClose={() => setFilterOpen(false)}
							title={t('toolbar.filters')}
							canReset={method !== 'all'}
							onReset={() => onMethod('all')}
							resetLabel={t('toolbar.reset')}
							doneLabel={t('toolbar.done')}
						>
							<IntakeOptionGroup label={t('payments.method')} name='billing-method' options={methodOptions} value={method} onChange={onMethod} />
						</IntakeFilterPopover>
					</IntakeToolbar>
				)}
				columns={columns}
				data={rows}
				isLoading={loading}
				rowKey={row => row.id}
				labels={{
					emptyTitle: err ? t('errors.load') : filteredOut ? t('payments.emptyFiltered') : t('payments.emptyTitle'),
					emptySubtitle: err || filteredOut ? '' : t('payments.emptyStart'),
				}}
				pagination={{ current_page: page, per_page: perPage, total_records: total }}
				onPageChange={onPageChange}
				perPageOptions={PER_PAGE_OPTIONS}
				hoverable
			/>
		</div>
	);
}
