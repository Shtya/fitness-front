'use client';

export default function ClientCheckins({ items = [] }) {
	return (
		<div className='rounded-xl border border-slate-200 bg-white p-4'>
			<h3 className='font-semibold text-slate-800 mb-3'>Check-ins</h3>
			{items.length ? (
				<ul className='space-y-2'>
					{items.map((c, i) => <li key={c.id || i} className='text-sm text-slate-700'>{JSON.stringify(c)}</li>)}
				</ul>
			) : (
				<div className='text-sm text-slate-500'>No check-ins yet.</div>
			)}
		</div>
	);
}
