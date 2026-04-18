'use client';

import { useState } from 'react';

export default function SendReminderDialog({ open, onClose, onSend }) {
	const [message, setMessage] = useState('');
	if (!open) return null;
	return (
		<div className='fixed inset-0 z-50 bg-black/40 grid place-items-center'>
			<div className='w-full max-w-lg rounded-xl bg-white p-4'>
				<h3 className='font-semibold text-slate-800 mb-3'>Send Reminder</h3>
				<textarea className='w-full h-32 rounded-lg border border-slate-200 px-3 py-2' value={message} onChange={(e) => setMessage(e.target.value)} placeholder='Write reminder...' />
				<div className='mt-4 flex justify-end gap-2'>
					<button onClick={onClose} className='h-9 px-3 rounded-lg border border-slate-200 text-sm'>Cancel</button>
					<button onClick={() => onSend?.(message)} className='h-9 px-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold'>Send</button>
				</div>
			</div>
		</div>
	);
}
