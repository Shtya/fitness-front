'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/utils/axios';

export default function usePackages(initialQuery = {}) {
	const [items, setItems] = useState([]);
	const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
	const [query, setQuery] = useState({ page: 1, limit: 20, ...initialQuery });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const fetchPackages = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const { data } = await api.get('/billing/plans', { params: query });
			setItems(data?.items || []);
			setMeta(data?.meta || meta);
		} catch (e) {
			setError(e?.response?.data?.message || 'Failed to load packages');
		} finally {
			setLoading(false);
		}
	}, [query, meta]);

	const createPackage = useCallback(async (payload) => {
		await api.post('/billing/plans', payload);
		await fetchPackages();
	}, [fetchPackages]);

	const updatePackage = useCallback(async (id, payload) => {
		await api.patch(`/billing/plans/${id}`, payload);
		await fetchPackages();
	}, [fetchPackages]);

	useEffect(() => { fetchPackages(); }, [fetchPackages]);

	return { items, meta, query, setQuery, loading, error, createPackage, updatePackage, refetch: fetchPackages };
}
