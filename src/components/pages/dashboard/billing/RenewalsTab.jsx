'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleSlash, Layers, MessageCircle, Receipt, XCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import Badge from '@/components/atoms/GmBadge';
import GmRowActions from '@/components/atoms/GmRowActions';
import DataTable from '@/components/atoms/Datatable';
import { IntakeToolbar } from '@/components/pages/dashboard/intake/IntakeChrome';
import { STATUS_COLOR, formatDate, whatsappLink } from './billing-utils';

const PER_PAGE_OPTIONS = [25, 50, 100];
const STATUS_RANK = { expiring: 0, expired: 1, active: 2, none: 3 };

/** Most urgent first: ending this week, then the most recently expired, then by days left. */
function urgency(a, b) {
	const r = STATUS_RANK[a.subscriptionStatus] - STATUS_RANK[b.subscriptionStatus];
	if (r) return r;
	if (a.subscriptionStatus === 'expired') return (b.daysLeft ?? 0) - (a.daysLeft ?? 0);
	return (a.daysLeft ?? 0) - (b.daysLeft ?? 0);
}

export default function RenewalsTab({ clients, loading, onRecord }) {
	const t = useTranslations('billing');
	const locale = useLocale();
	const [search, setSearch] = useState('');
	const [status, setStatus] = useState('all');
	const [page, setPage] = useState(1);
	const [perPage, setPerPage] = useState(25);

	useEffect(() => { setPage(1); }, [search, status]);

	const counts = useMemo(() => {
		const c = { all: clients.length, expiring: 0, expired: 0, active: 0, none: 0 };
		for (const row of clients) c[row.subscriptionStatus] = (c[row.subscriptionStatus] || 0) + 1;
		return c;
	}, [clients]);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		return clients
			.filter(c => status === 'all' || c.subscriptionStatus === status)
			.filter(c => !q || [c.name, c.phone, c.email].some(v => String(v || '').toLowerCase().includes(q)))
			.sort(urgency);
	}, [clients, search, status]);

	const rows = useMemo(() => filtered.slice((page - 1) * perPage, page * perPage), [filtered, page, perPage]);

	const segments = useMemo(() => [
		{ id: 'all', name: `${t('renewals.all')} (${counts.all})`, icon: Layers },
		{ id: 'expiring', name: `${t('status.expiring')} (${counts.expiring})`, icon: AlertTriangle },
		{ id: 'expired', name: `${t('status.expired')} (${counts.expired})`, icon: XCircle },
		{ id: 'active', name: `${t('status.active')} (${counts.active})`, icon: CheckCircle2 },
		{ id: 'none', name: `${t('status.none')} (${counts.none})`, icon: CircleSlash },
	].filter(s => s.id === 'all' || s.id === status || counts[s.id] > 0), [t, counts, status]);

	const reminder = useCallback((row) => {
		const date = formatDate(row.subscriptionEnd, locale);
		const key = row.subscriptionStatus === 'expired' ? 'renewals.whatsappExpired' : row.subscriptionStatus === 'none' ? 'renewals.whatsappNone' : 'renewals.whatsappEnding';
		return whatsappLink(row.phone, t(key, { name: String(row.name || '').split(' ')[0], date }));
	}, [t, locale]);

	const columns = useMemo(() => [
		{
			key: 'client',
			header: t('renewals.client'),
			headClassName: 'min-w-[200px]',
			cell: row => (
				<span className='flex min-w-0 flex-col'>
					<span dir='auto' className='truncate text-[13px] font-bold gm-ink'>{row.name}</span>
					<span dir='ltr' className='truncate text-start font-en text-[11.5px] gm-muted'>{row.phone || row.email}</span>
				</span>
			),
		},
		{
			key: 'package',
			header: t('renewals.package'),
			cell: row => (row.membership ? <span dir='auto' className='text-[12.5px] font-semibold gm-ink-soft'>{row.membership}</span> : <span className='gm-faint'>—</span>),
		},
		{
			key: 'ends',
			header: t('renewals.ends'),
			cell: row => {
				if (!row.subscriptionEnd) return <span className='gm-faint'>—</span>;
				const d = row.daysLeft ?? 0;
				const tone = row.subscriptionStatus === 'expired' ? 'text-(--gm-danger)' : row.subscriptionStatus === 'expiring' ? 'text-(--gm-warn)' : 'gm-muted';
				return (
					<span className='flex flex-col'>
						<span className='text-[12.5px] font-semibold gm-ink'>{formatDate(row.subscriptionEnd, locale)}</span>
						<span className={`text-[11px] font-semibold ${tone}`}>
							{d >= 0 ? t('renewals.daysLeft', { days: d }) : t('renewals.daysAgo', { days: -d })}
						</span>
					</span>
				);
			},
		},
		{
			key: 'status',
			header: t('renewals.status'),
			cell: row => <Badge color={STATUS_COLOR[row.subscriptionStatus] || 'slate'} dot>{t(`status.${row.subscriptionStatus}`)}</Badge>,
		},
		{
			key: 'lastPayment',
			header: t('renewals.lastPayment'),
			cell: row => (row.lastPaymentAt ? <span className='text-[12px] gm-ink-soft'>{formatDate(row.lastPaymentAt, locale)}</span> : <span className='gm-faint'>—</span>),
		},
		{
			key: 'actions',
			header: '',
			headClassName: 'gm-col-end',
			className: 'gm-col-end',
			cell: row => {
				const wa = reminder(row);
				return (
					<GmRowActions
						options={[
							{ icon: Receipt, tone: 'primary', label: t('actions.recordFor'), hide: !onRecord, onClick: () => onRecord?.(row.id) },
							{ icon: MessageCircle, tone: 'cyan', label: wa ? t('actions.whatsapp') : t('renewals.noPhone'), disabled: !wa, onClick: () => wa && window.open(wa, '_blank', 'noopener,noreferrer') },
						]}
					/>
				);
			},
		},
	], [t, locale, onRecord, reminder]);

	const onPageChange = useCallback(({ page: nextPage, per_page }) => {
		const nextLimit = Number(per_page || perPage);
		if (nextLimit !== perPage) {
			setPerPage(nextLimit);
			setPage(1);
		} else {
			setPage(Number(nextPage || 1));
		}
	}, [perPage]);

	const filteredOut = Boolean(search.trim()) || status !== 'all';

	return (
		<DataTable
			className='gm-table'
			hideToolbar
			compact
			toolbar={(
				<IntakeToolbar
					search={search}
					onSearch={setSearch}
					searchPlaceholder={t('renewals.searchPlaceholder')}
					searchLabel={t('toolbar.search')}
					clearSearchLabel={t('toolbar.clearAll')}
					segments={segments}
					segment={status}
					onSegment={setStatus}
					segmentLabel={t('renewals.status')}
					layoutId='billing-renewals-seg'
					result={t.rich('renewals.resultCount', { count: filtered.length, strong: chunks => <strong>{chunks}</strong> })}
				/>
			)}
			columns={columns}
			data={rows}
			isLoading={loading}
			rowKey={row => row.id}
			labels={{
				emptyTitle: filteredOut ? t('renewals.emptyFiltered') : t('renewals.emptyTitle'),
				emptySubtitle: filteredOut ? '' : t('renewals.emptyStart'),
			}}
			pagination={{ current_page: page, per_page: perPage, total_records: filtered.length }}
			onPageChange={onPageChange}
			perPageOptions={PER_PAGE_OPTIONS}
			hoverable
		/>
	);
}
