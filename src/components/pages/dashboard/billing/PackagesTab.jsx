'use client';

import { useMemo } from 'react';
import { PencilLine, Plus, Trash2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import Button from '@/components/atoms/Button';
import GmRowActions from '@/components/atoms/GmRowActions';
import DataTable from '@/components/atoms/Datatable';
import { formatMoney, planLength } from './billing-utils';

export default function PackagesTab({ plans, loading, canManage, onAdd, onEdit, onDelete }) {
	const t = useTranslations('billing');

	const columns = useMemo(() => [
		{
			key: 'name',
			header: t('packages.name'),
			headClassName: 'min-w-[200px]',
			className: 'max-w-[360px]',
			cell: row => (
				<span className='flex min-w-0 flex-col'>
					<span dir='auto' className='truncate text-[13px] font-bold gm-ink'>{row.name}</span>
					{row.description ? <span dir='auto' className='truncate text-[11.5px] gm-muted'>{row.description}</span> : null}
				</span>
			),
		},
		{
			key: 'price',
			header: t('packages.price'),
			cell: row => (
				<span dir='ltr' className='font-en text-[13.5px] font-bold tabular-nums gm-ink'>
					{formatMoney(row.price)} <span className='text-[10.5px] font-semibold gm-faint'>{t('currency')}</span>
				</span>
			),
		},
		{
			key: 'duration',
			header: t('packages.duration'),
			cell: row => {
				const { unit, count } = planLength(row);
				return <span className='text-[12.5px] font-semibold gm-ink-soft'>{t(unit === 'days' ? 'packages.days' : 'packages.months', { count })}</span>;
			},
		},
		{
			key: 'clients',
			header: t('packages.clients'),
			cell: row => (
				<span className='inline-flex items-center gap-1.5 text-[12.5px] font-semibold gm-ink-soft'>
					<Users className='size-3.5 gm-faint' />
					<span className='font-en tabular-nums'>{row.activeClients ?? 0}</span>
				</span>
			),
		},
		...(canManage ? [{
			key: 'actions',
			header: '',
			headClassName: 'gm-col-end',
			className: 'gm-col-end',
			cell: row => (
				<GmRowActions
					options={[
						{ icon: PencilLine, tone: 'amber', label: t('actions.edit'), onClick: () => onEdit(row) },
						{ icon: Trash2, tone: 'danger', label: t('actions.delete'), onClick: () => onDelete(row) },
					]}
				/>
			),
		}] : []),
	], [t, canManage, onEdit, onDelete]);

	return (
		<DataTable
			className='gm-table'
			hideToolbar
			compact
			toolbar={(
				<div className='flex flex-wrap items-center justify-between gap-3 px-1 pb-1'>
					<p className='max-w-xl text-[12.5px] gm-muted'>{t('packages.hint')}</p>
					{canManage && <Button color='primary' name={t('actions.addPackage')} onClick={onAdd} icon={<Plus className='size-4' />} />}
				</div>
			)}
			columns={columns}
			data={plans}
			isLoading={loading}
			rowKey={row => row.id}
			labels={{ emptyTitle: t('packages.emptyTitle'), emptySubtitle: t('packages.emptyStart') }}
			hoverable
		/>
	);
}
