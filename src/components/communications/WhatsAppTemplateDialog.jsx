'use client';

import { useMemo, useState } from 'react';
import { WHATSAPP_TEMPLATES } from '@/utils/whatsappTemplates';

export default function WhatsAppTemplateDialog({ open, onClose, client, onSelect }) {
	const [type, setType] = useState('renewal');
	const preview = useMemo(() => {
		const fn = WHATSAPP_TEMPLATES[type];
		return fn ? fn({ name: client?.name || '', endDate: client?.renewalDate || '', packageName: client?.currentPackage || '' }) : '';
	}, [type, client]);
	if (!open) return null;
	return (
		<div className='fixed inset-0 z-50 bg-black/40 grid place-items-center'>
			<div className='w-full max-w-lg rounded-xl bg-white p-4'>
				<h3 className='font-semibold text-slate-800 mb-3'>WhatsApp Template</h3>
				<select className='h-10 rounded-lg border border-slate-200 px-3 w-full mb-3' value={type} onChange={(e) => setType(e.target.value)}>
					<option value='renewal'>Renewal</option>
					<option value='inactiveFollowup'>Inactive Follow-up</option>
					<option value='packageOffer'>Package Offer</option>
					<option value='reminder'>Reminder</option>
				</select>
				<textarea className='w-full h-32 rounded-lg border border-slate-200 px-3 py-2' value={preview} readOnly />
				<div className='mt-4 flex justify-end gap-2'>
					<button onClick={onClose} className='h-9 px-3 rounded-lg border border-slate-200 text-sm'>Cancel</button>
					<button onClick={() => onSelect?.({ type, message: preview })} className='h-9 px-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold'>Use template</button>
				</div>
			</div>
		</div>
	);
}
