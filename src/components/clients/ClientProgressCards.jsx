'use client';

export default function ClientProgressCards({ progress }) {
	const paymentMonth = progress?.monthlyPayments?.[0];
	const subMonth = progress?.monthlySubscriptions?.[0];
	return (
		<div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
			<div className='rounded-xl border border-slate-200 bg-white p-4'>
				<div className='text-xs text-slate-500'>Monthly Payment (latest)</div>
				<div className='text-xl font-bold text-slate-800'>{paymentMonth ? `${paymentMonth.total} EGP` : '—'}</div>
			</div>
			<div className='rounded-xl border border-slate-200 bg-white p-4'>
				<div className='text-xs text-slate-500'>Subscription Changes (latest month)</div>
				<div className='text-xl font-bold text-slate-800'>{subMonth ? subMonth.count : 0}</div>
			</div>
			<div className='rounded-xl border border-slate-200 bg-white p-4'>
				<div className='text-xs text-slate-500'>Check-ins</div>
				<div className='text-xl font-bold text-slate-800'>{progress?.monthlyCheckins?.length || 0}</div>
			</div>
		</div>
	);
}
