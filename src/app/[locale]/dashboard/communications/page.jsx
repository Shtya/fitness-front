'use client';

import { useState } from 'react';
import useClients from '@/hooks/useClients';
import useCommunications from '@/hooks/useCommunications';
import CommunicationCenter from '@/components/communications/CommunicationCenter';
import ClientCommunicationLog from '@/components/clients/ClientCommunicationLog';
import FloatingSelect from '@/components/atoms/FloatingSelect';

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
			<div className='max-w-md'>
				<FloatingSelect
					label="Client"
					value={clientId || null}
					onChange={(id) => setClientId(id || '')}
					searchable
					options={clients.map((c) => ({ id: c.id, label: c.name }))}
				/>
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
