'use client';

import { useParams } from 'next/navigation';
import useClientDetails from '@/hooks/useClientDetails';
import useClientTimeline from '@/hooks/useClientTimeline';
import useCommunications from '@/hooks/useCommunications';
import ClientProfileHeader from '@/components/clients/ClientProfileHeader';
import ClientProgressCards from '@/components/clients/ClientProgressCards';
import ClientTimeline from '@/components/clients/ClientTimeline';
import ClientNotes from '@/components/clients/ClientNotes';
import ClientCheckins from '@/components/clients/ClientCheckins';
import ClientPlansHistory from '@/components/clients/ClientPlansHistory';
import ClientMeasurementsChart from '@/components/clients/ClientMeasurementsChart';
import ClientPaymentsSummary from '@/components/clients/ClientPaymentsSummary';
import ClientCommunicationLog from '@/components/clients/ClientCommunicationLog';
import CommunicationCenter from '@/components/communications/CommunicationCenter';
import api from '@/utils/axios';
import { useEffect, useState } from 'react';

export default function ClientDetailsPage() {
	const params = useParams();
	const clientId = params?.id;
	const { data, loading, refetch } = useClientDetails(clientId);
	const { items: timeline } = useClientTimeline(clientId);
	const { items: communications, sendCommunication, refetch: refetchComms } = useCommunications(clientId);
	const [notes, setNotes] = useState([]);
	const [plansHistory, setPlansHistory] = useState([]);
	const [progress, setProgress] = useState(null);
	const [checkins, setCheckins] = useState([]);

	useEffect(() => {
		if (!clientId) return;
		(async () => {
			const [notesRes, plansRes, progressRes, checkinsRes] = await Promise.all([
				api.get(`/billing/clients/${clientId}/notes`),
				api.get(`/billing/clients/${clientId}/plans-history`),
				api.get(`/billing/clients/${clientId}/progress`),
				api.get(`/billing/clients/${clientId}/checkins`),
			]);
			setNotes(notesRes?.data || []);
			setPlansHistory(plansRes?.data || []);
			setProgress(progressRes?.data || null);
			setCheckins(checkinsRes?.data || []);
		})();
	}, [clientId]);

	const reloadNotes = async () => {
		const { data } = await api.get(`/billing/clients/${clientId}/notes`);
		setNotes(data || []);
	};

	if (loading) return <div className='p-6 text-slate-500'>Loading client profile...</div>;

	return (
		<div className='space-y-4'>
			<ClientProfileHeader client={data} />
			<ClientProgressCards progress={progress} />
			<div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
				<ClientPaymentsSummary total={data?.paymentsSummary || 0} />
				<ClientMeasurementsChart data={progress?.monthlyMeasurements || []} />
			</div>
			<div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
				<ClientTimeline items={timeline} />
				<ClientPlansHistory items={plansHistory} />
			</div>
			<div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
				<ClientNotes clientId={clientId} notes={notes} onReload={reloadNotes} />
				<ClientCheckins items={checkins} />
			</div>
			<CommunicationCenter client={data?.profile} onSend={async (payload) => { await sendCommunication(payload); await refetchComms(); await refetch(); }} />
			<ClientCommunicationLog items={communications} />
		</div>
	);
}
