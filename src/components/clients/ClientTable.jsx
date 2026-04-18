'use client';

import Link from 'next/link';
import { formatDate } from '@/utils/formatters';

export default function ClientTable({ clients = [], loading = false }) {
	if (loading) return <div className='rounded-xl border border-slate-200 bg-white p-6 text-slate-500'>Loading clients...</div>;
	return (
		<div className='rounded-xl border border-slate-200 bg-white overflow-hidden'>
			<table className='w-full text-sm'>
				<thead className='bg-slate-50 text-slate-600'>
					<tr>
						<th className='px-3 py-2 text-left'>Client</th>
						<th className='px-3 py-2 text-left'>Contact</th>
						<th className='px-3 py-2 text-left'>Package</th>
						<th className='px-3 py-2 text-left'>Subscription</th>
						<th className='px-3 py-2 text-left'>Renewal</th>
						<th className='px-3 py-2 text-left'>Last Activity</th>
						<th className='px-3 py-2 text-left'>Actions</th>
					</tr>
				</thead>
				<tbody>
					{clients.map((c) => (
						<tr key={c.id} className='border-t border-slate-100'>
							<td className='px-3 py-2 font-medium text-slate-800'>{c.name}</td>
							<td className='px-3 py-2 text-slate-600'>
								<div>{c.email}</div>
								<div>{c.phone || '—'}</div>
							</td>
							<td className='px-3 py-2'>{c.currentPackage || '—'}</td>
							<td className='px-3 py-2 capitalize'>{String(c.subscriptionStatus || 'pending').replace('_', ' ')}</td>
							<td className='px-3 py-2'>{formatDate(c.renewalDate)}</td>
							<td className='px-3 py-2'>{formatDate(c.lastActivity)}</td>
							<td className='px-3 py-2'>
								<Link className='text-indigo-600 font-semibold' href={`/dashboard/clients/${c.id}`}>Open</Link>
							</td>
						</tr>
					))}
					{!clients.length && (
						<tr><td colSpan={7} className='px-3 py-8 text-center text-slate-500'>No clients found.</td></tr>
					)}
				</tbody>
			</table>
		</div>
	);
}
