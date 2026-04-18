'use client';

import { useEffect, useState } from 'react';

export default function PackageFormDialog({ open, onClose, initialValue, onSubmit }) {
	const [form, setForm] = useState({ name: '', interval: 'monthly', price: '', currency: 'EGP' });
	useEffect(() => {
		if (initialValue) setForm({
			name: initialValue.name || '',
			interval: initialValue.interval || 'monthly',
			price: initialValue.price || '',
			currency: initialValue.currency || 'EGP',
		});
	}, [initialValue]);
	if (!open) return null;
	return (
		<div className='fixed inset-0 z-50 bg-black/40 grid place-items-center'>
			<div className='w-full max-w-md rounded-xl bg-white p-4'>
				<h3 className='font-semibold text-slate-800 mb-3'>{initialValue ? 'Edit Package' : 'Create Package'}</h3>
				<div className='space-y-2'>
					<input className='h-10 rounded-lg border border-slate-200 px-3 w-full' placeholder='Name' value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
					<select className='h-10 rounded-lg border border-slate-200 px-3 w-full' value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value })}>
						<option value='monthly'>Monthly</option>
						<option value='quarterly'>Quarterly</option>
						<option value='yearly'>Yearly</option>
						<option value='one_time'>One Time</option>
					</select>
					<input className='h-10 rounded-lg border border-slate-200 px-3 w-full' placeholder='Price' value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
				</div>
				<div className='mt-4 flex justify-end gap-2'>
					<button onClick={onClose} className='h-9 px-3 rounded-lg border border-slate-200 text-sm'>Cancel</button>
					<button onClick={() => onSubmit?.(form)} className='h-9 px-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold'>Save</button>
				</div>
			</div>
		</div>
	);
}
