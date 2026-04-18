'use client';

import { useState } from 'react';
import SendReminderDialog from './SendReminderDialog';
import WhatsAppTemplateDialog from './WhatsAppTemplateDialog';
import { buildWhatsAppLink } from '@/utils/whatsappTemplates';

export default function CommunicationCenter({ client, onSend }) {
	const [reminderOpen, setReminderOpen] = useState(false);
	const [waOpen, setWaOpen] = useState(false);

	const sendReminder = async (message) => {
		await onSend?.({ type: 'reminder', message });
		setReminderOpen(false);
	};

	const sendWhatsApp = async ({ type, message }) => {
		await onSend?.({ type: 'whatsapp', template: type, message });
		const link = buildWhatsAppLink(client?.phone, message);
		if (link) window.open(link, '_blank');
		setWaOpen(false);
	};

	return (
		<div className='rounded-xl border border-slate-200 bg-white p-4'>
			<h3 className='font-semibold text-slate-800 mb-3'>Communication Center</h3>
			<div className='flex flex-wrap gap-2'>
				<button onClick={() => setReminderOpen(true)} className='h-9 px-3 rounded-lg border border-slate-200 text-sm font-semibold'>Send Reminder</button>
				<button onClick={() => setWaOpen(true)} className='h-9 px-3 rounded-lg border border-slate-200 text-sm font-semibold'>WhatsApp Template</button>
			</div>
			<SendReminderDialog open={reminderOpen} onClose={() => setReminderOpen(false)} onSend={sendReminder} />
			<WhatsAppTemplateDialog open={waOpen} onClose={() => setWaOpen(false)} client={client} onSelect={sendWhatsApp} />
		</div>
	);
}
