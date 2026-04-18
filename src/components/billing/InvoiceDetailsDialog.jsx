'use client';

export default function InvoiceDetailsDialog({ open, onClose, invoice }) {
	if (!open) return null;
	return (
		<div className='fixed inset-0 z-50 bg-black/40 grid place-items-center'>
			<div className='w-full max-w-2xl rounded-xl bg-white p-4'>
				<h3 className='font-semibold text-slate-800 mb-3'>Invoice Details</h3>
				<pre className='bg-slate-50 rounded-lg p-3 text-xs overflow-auto max-h-[60vh]'>{JSON.stringify(invoice || {}, null, 2)}</pre>
				<div className='mt-4 flex justify-end'>
					<button onClick={onClose} className='h-9 px-3 rounded-lg border border-slate-200 text-sm'>Close</button>
				</div>
			</div>
		</div>
	);
}
