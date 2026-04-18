'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/utils/axios';

export default function useSubscriptions(initialQuery = {}) {
	const [items, setItems] = useState([]);
	const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
	const [query, setQuery] = useState({ page: 1, limit: 20, ...initialQuery });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const fetchSubscriptions = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const { data } = await api.get('/billing/subscriptions', { params: query });
			setItems(data?.items || []);
			setMeta(data?.meta || meta);
		} catch (e) {
			setError(e?.response?.data?.message || 'Failed to load subscriptions');
		} finally {
			setLoading(false);
		}
	}, [query, meta]);

	const updateSubscription = useCallback(async (id, payload) => {
		await api.patch(`/billing/subscriptions/${id}`, payload);
		await fetchSubscriptions();
	}, [fetchSubscriptions]);

	useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

	return { items, meta, query, setQuery, loading, error, updateSubscription, refetch: fetchSubscriptions };
}
