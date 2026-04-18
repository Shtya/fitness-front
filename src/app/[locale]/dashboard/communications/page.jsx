'use client';

import { useState } from 'react';
import useClients from '@/hooks/useClients';
import useCommunications from '@/hooks/useCommunications';
import CommunicationCenter from '@/components/communications/CommunicationCenter';
import ClientCommunicationLog from '@/components/clients/ClientCommunicationLog';

export default function CommunicationsPage() {
	const { items: clients } = useClients({ limit: 100 });
	const [clientId, setClientId] = useState('');
	const selected = clients.find((c) => c.id === clientId) || null;
	const { items, sendCommunication, refetch } = useCommunications(clientId);

	return (
		<div className='space-y-4'>
			<div>
				<h1 className='text-2xl font-bold text-slate-800'>Communications</h1>
				<p className='text-slate-500'>Centralized reminders, WhatsApp templates, renewal follow-up, and logs.</p>
			</div>
			<div className='rounded-xl border border-slate-200 bg-white p-4'>
				<label className='block text-sm font-medium text-slate-700 mb-1'>Client</label>
				<select value={clientId} onChange={(e) => setClientId(e.target.value)} className='h-10 rounded-lg border border-slate-200 px-3 w-full max-w-md'>
					<option value=''>Select client</option>
					{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
				</select>
			</div>
			{clientId ? (
				<>
					<CommunicationCenter client={selected} onSend={async (payload) => { await sendCommunication(payload); await refetch(); }} />
					<ClientCommunicationLog items={items} />
				</>
			) : (
				<div className='text-slate-500'>Choose a client to start communication actions.</div>
			)}
		</div>
	);
}
