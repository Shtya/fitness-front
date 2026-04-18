'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/utils/axios';

export default function usePayments(initialQuery = {}) {
	const [items, setItems] = useState([]);
	const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
	const [query, setQuery] = useState({ page: 1, limit: 20, ...initialQuery });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const fetchPayments = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const { data } = await api.get('/billing/payments', { params: query });
			setItems(data?.items || []);
			setMeta(data?.meta || meta);
		} catch (e) {
			setError(e?.response?.data?.message || 'Failed to load payments');
		} finally {
			setLoading(false);
		}
	}, [query, meta]);

	useEffect(() => { fetchPayments(); }, [fetchPayments]);

	return { items, meta, query, setQuery, loading, error, refetch: fetchPayments };
}
