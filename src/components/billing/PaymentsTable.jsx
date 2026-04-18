'use client';

import { formatDate, formatMoney } from '@/utils/formatters';

export default function PaymentsTable({ items = [], loading = false }) {
	if (loading) return <div className='rounded-xl border border-slate-200 bg-white p-6 text-slate-500'>Loading payments...</div>;
	return (
		<div className='rounded-xl border border-slate-200 bg-white overflow-hidden'>
			<table className='w-full text-sm'>
				<thead className='bg-slate-50 text-slate-600'>
					<tr>
						<th className='px-3 py-2 text-left'>Client</th>
						<th className='px-3 py-2 text-left'>Amount</th>
						<th className='px-3 py-2 text-left'>Method</th>
						<th className='px-3 py-2 text-left'>Status</th>
						<th className='px-3 py-2 text-left'>Date</th>
					</tr>
				</thead>
				<tbody>
					{items.map((p) => (
						<tr key={p.id} className='border-t border-slate-100'>
							<td className='px-3 py-2'>{p.user?.name || '—'}</td>
							<td className='px-3 py-2 font-medium'>{formatMoney(p.amount, p.currency)}</td>
							<td className='px-3 py-2 capitalize'>{p.paymentMethod || '—'}</td>
							<td className='px-3 py-2 capitalize'>{p.status || '—'}</td>
							<td className='px-3 py-2'>{formatDate(p.created_at)}</td>
						</tr>
					))}
					{!items.length && <tr><td colSpan={5} className='px-3 py-8 text-center text-slate-500'>No payments found.</td></tr>}
				</tbody>
			</table>
		</div>
	);
}
