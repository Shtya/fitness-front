'use client';

import { formatDate } from '@/utils/formatters';

export default function ClientPlansHistory({ items = [] }) {
	return (
		<div className='rounded-xl border border-slate-200 bg-white p-4'>
			<h3 className='font-semibold text-slate-800 mb-3'>Plans History</h3>
			<div className='space-y-2'>
				{items.map((p) => (
					<div key={p.id} className='rounded-lg border border-slate-100 p-2'>
						<div className='font-medium text-slate-800'>{p.planName || 'Plan'}</div>
						<div className='text-xs text-slate-500'>{formatDate(p.startDate)} → {formatDate(p.endDate)} · {p.status}</div>
					</div>
				))}
				{!items.length && <div className='text-sm text-slate-500'>No plans history yet.</div>}
			</div>
		</div>
	);
}
