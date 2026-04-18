'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/utils/axios';

export default function useClientDetails(clientId) {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const fetchClient = useCallback(async () => {
		if (!clientId) return;
		setLoading(true);
		setError(null);
		try {
			const { data } = await api.get(`/billing/clients/${clientId}`);
			setData(data || null);
		} catch (e) {
			setError(e?.response?.data?.message || 'Failed to load client');
		} finally {
			setLoading(false);
		}
	}, [clientId]);

	useEffect(() => { fetchClient(); }, [fetchClient]);

	return { data, loading, error, refetch: fetchClient };
}
