'use client';

import usePayments from '@/hooks/usePayments';
import PaymentsTable from '@/components/billing/PaymentsTable';

export default function PaymentsPage() {
	const { items, loading } = usePayments();
	return (
		<div className='space-y-4'>
			<div>
				<h1 className='text-2xl font-bold text-slate-800'>Payments</h1>
				<p className='text-slate-500'>Transactions, invoices, receipts, and statuses.</p>
			</div>
			<PaymentsTable items={items} loading={loading} />
		</div>
	);
}
