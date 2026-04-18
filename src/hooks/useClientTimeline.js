'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/utils/axios';

export default function useClientTimeline(clientId, initialType = '') {
	const [items, setItems] = useState([]);
	const [type, setType] = useState(initialType);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const fetchTimeline = useCallback(async () => {
		if (!clientId) return;
		setLoading(true);
		setError(null);
		try {
			const { data } = await api.get(`/billing/clients/${clientId}/timeline`, {
				params: type ? { type } : {},
			});
			setItems(Array.isArray(data) ? data : []);
		} catch (e) {
			setError(e?.response?.data?.message || 'Failed to load timeline');
		} finally {
			setLoading(false);
		}
	}, [clientId, type]);

	useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

	return { items, loading, error, type, setType, refetch: fetchTimeline };
}
