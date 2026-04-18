'use client';

import { formatDate } from '@/utils/formatters';

export default function SubscriptionsTable({ items = [], loading = false, onAction }) {
	if (loading) return <div className='rounded-xl border border-slate-200 bg-white p-6 text-slate-500'>Loading subscriptions...</div>;
	return (
		<div className='rounded-xl border border-slate-200 bg-white overflow-hidden'>
			<table className='w-full text-sm'>
				<thead className='bg-slate-50 text-slate-600'>
					<tr>
						<th className='px-3 py-2 text-left'>Client</th>
						<th className='px-3 py-2 text-left'>Package</th>
						<th className='px-3 py-2 text-left'>Status</th>
						<th className='px-3 py-2 text-left'>Start</th>
						<th className='px-3 py-2 text-left'>End</th>
						<th className='px-3 py-2 text-left'>Actions</th>
					</tr>
				</thead>
				<tbody>
					{items.map((s) => (
						<tr key={s.id} className='border-t border-slate-100'>
							<td className='px-3 py-2'>{s.user?.name || '—'}</td>
							<td className='px-3 py-2'>{s.plan?.name || '—'}</td>
							<td className='px-3 py-2 capitalize'>{String(s.status || 'pending').replace('_', ' ')}</td>
							<td className='px-3 py-2'>{formatDate(s.startDate)}</td>
							<td className='px-3 py-2'>{formatDate(s.endDate)}</td>
							<td className='px-3 py-2 space-x-1'>
								<button className='text-xs px-2 py-1 rounded border' onClick={() => onAction?.(s.id, 'pause')}>Pause</button>
								<button className='text-xs px-2 py-1 rounded border' onClick={() => onAction?.(s.id, 'resume')}>Resume</button>
								<button className='text-xs px-2 py-1 rounded border' onClick={() => onAction?.(s.id, 'cancel')}>Cancel</button>
							</td>
						</tr>
					))}
					{!items.length && <tr><td colSpan={6} className='px-3 py-8 text-center text-slate-500'>No subscriptions found.</td></tr>}
				</tbody>
			</table>
		</div>
	);
}
