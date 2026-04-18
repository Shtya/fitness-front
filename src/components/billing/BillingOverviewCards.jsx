'use client';

import { formatMoney } from '@/utils/formatters';

export default function BillingOverviewCards({ cards = {} }) {
	const data = [
		{ label: 'Revenue Collected', value: formatMoney(cards.revenueCollected || 0) },
		{ label: 'Outstanding Amount', value: formatMoney(cards.outstandingAmount || 0) },
		{ label: 'Active Subscriptions', value: Number(cards.activeSubscriptions || 0) },
		{ label: 'Payments Count', value: Number(cards.totalPayments || 0) },
	];
	return (
		<div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
			{data.map((x) => (
				<div key={x.label} className='rounded-xl border border-slate-200 bg-white p-4'>
					<div className='text-xs text-slate-500'>{x.label}</div>
					<div className='text-xl font-bold text-slate-800'>{x.value}</div>
				</div>
			))}
		</div>
	);
}
