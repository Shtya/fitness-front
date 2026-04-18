'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/utils/axios';

export default function useCommunications(clientId) {
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const fetchCommunications = useCallback(async () => {
		if (!clientId) return;
		setLoading(true);
		setError(null);
		try {
			const { data } = await api.get(`/billing/clients/${clientId}/communications`);
			setItems(Array.isArray(data) ? data : []);
		} catch (e) {
			setError(e?.response?.data?.message || 'Failed to load communications');
		} finally {
			setLoading(false);
		}
	}, [clientId]);

	const sendCommunication = useCallback(async (payload) => {
		if (!clientId) return;
		await api.post(`/billing/clients/${clientId}/communications/send`, payload);
		await fetchCommunications();
	}, [clientId, fetchCommunications]);

	useEffect(() => { fetchCommunications(); }, [fetchCommunications]);

	return { items, loading, error, sendCommunication, refetch: fetchCommunications };
}
