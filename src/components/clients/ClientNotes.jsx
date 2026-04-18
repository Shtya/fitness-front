'use client';

import { useState } from 'react';
import api from '@/utils/axios';

export default function ClientNotes({ clientId, notes = [], onReload }) {
	const [text, setText] = useState('');
	const [saving, setSaving] = useState(false);

	const addNote = async () => {
		if (!text.trim()) return;
		setSaving(true);
		try {
			await api.post(`/billing/clients/${clientId}/notes`, { text: text.trim(), type: 'general' });
			setText('');
			onReload?.();
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className='rounded-xl border border-slate-200 bg-white p-4'>
			<h3 className='font-semibold text-slate-800 mb-3'>Coach Notes</h3>
			<div className='flex gap-2 mb-3'>
				<input className='h-10 rounded-lg border border-slate-200 px-3 flex-1' value={text} onChange={(e) => setText(e.target.value)} placeholder='Write note...' />
				<button disabled={saving} onClick={addNote} className='h-10 px-4 rounded-lg bg-indigo-600 text-white text-sm font-semibold'>
					{saving ? 'Saving...' : 'Add'}
				</button>
			</div>
			<div className='space-y-2'>
				{notes.map((n) => (
					<div key={n.id} className='rounded-lg border border-slate-100 p-2'>
						<div className='text-xs text-slate-500'>{n.type}</div>
						<div className='text-sm text-slate-700'>{n.text}</div>
					</div>
				))}
				{!notes.length && <div className='text-sm text-slate-500'>No notes yet.</div>}
			</div>
		</div>
	);
}
