'use client';

import { formatDate } from '@/utils/formatters';

export default function ClientTimeline({ items = [] }) {
	return (
		<div className='rounded-xl border border-slate-200 bg-white p-4'>
			<h3 className='font-semibold text-slate-800 mb-3'>Timeline</h3>
			<div className='space-y-3'>
				{items.map((e, idx) => (
					<div key={`${e.type}-${idx}`} className='border-l-2 border-slate-200 pl-3'>
						<div className='text-xs text-slate-500'>{formatDate(e.at)}</div>
						<div className='font-medium text-slate-800'>{e.title}</div>
						<div className='text-sm text-slate-600'>{e.description}</div>
					</div>
				))}
				{!items.length && <div className='text-sm text-slate-500'>No timeline events yet.</div>}
			</div>
		</div>
	);
}
