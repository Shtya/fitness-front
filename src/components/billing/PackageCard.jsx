'use client';

export default function PackageCard({ item, onEdit }) {
	return (
		<div className='rounded-xl border border-slate-200 bg-white p-4'>
			<div className='flex items-start justify-between gap-3'>
				<div>
					<h3 className='font-semibold text-slate-800'>{item.name}</h3>
					<p className='text-xs text-slate-500 capitalize'>{item.interval} · {item.currency}</p>
				</div>
				<div className='text-lg font-bold text-slate-800'>{item.price}</div>
			</div>
			<div className='mt-3 flex justify-end'>
				<button onClick={() => onEdit?.(item)} className='h-8 px-3 rounded-lg border border-slate-200 text-xs font-semibold'>
					Edit
				</button>
			</div>
		</div>
	);
}
