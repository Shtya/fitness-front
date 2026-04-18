'use client';

import { formatMoney } from '@/utils/formatters';

export default function ClientPaymentsSummary({ total = 0 }) {
	return (
		<div className='rounded-xl border border-slate-200 bg-white p-4'>
			<h3 className='font-semibold text-slate-800 mb-2'>Payments Summary</h3>
			<div className='text-2xl font-bold text-slate-800'>{formatMoney(total)}</div>
		</div>
	);
}
