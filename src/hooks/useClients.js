'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/utils/axios';

export default function useClients(initialQuery = {}) {
	const [items, setItems] = useState([]);
	const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [query, setQuery] = useState({ page: 1, limit: 20, ...initialQuery });

	const fetchClients = useCallback(async (nextQuery) => {
		setLoading(true);
		setError(null);
		try {
			const params = nextQuery || query;
			const { data } = await api.get('/billing/clients', { params });
			setItems(data?.items || []);
			setMeta(data?.meta || meta);
		} catch (e) {
			setError(e?.response?.data?.message || 'Failed to load clients');
		} finally {
			setLoading(false);
		}
	}, [query, meta]);

	useEffect(() => { fetchClients(query); }, [query, fetchClients]);

	return { items, meta, loading, error, query, setQuery, refetch: () => fetchClients(query) };
}
