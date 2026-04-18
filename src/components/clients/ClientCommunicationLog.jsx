'use client';

import { formatDate } from '@/utils/formatters';

export default function ClientCommunicationLog({ items = [] }) {
	return (
		<div className='rounded-xl border border-slate-200 bg-white p-4'>
			<h3 className='font-semibold text-slate-800 mb-3'>Communication Log</h3>
			<div className='space-y-2'>
				{items.map((c) => (
					<div key={c.id} className='rounded-lg border border-slate-100 p-2'>
						<div className='text-sm font-medium text-slate-800'>{c.type}</div>
						<div className='text-xs text-slate-500'>{formatDate(c.created_at)} · {c.status}</div>
						<div className='text-sm text-slate-700'>{c.message || c.template || '—'}</div>
					</div>
				))}
				{!items.length && <div className='text-sm text-slate-500'>No communications yet.</div>}
			</div>
		</div>
	);
}
