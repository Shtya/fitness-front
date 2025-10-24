// --- File: src/hooks/useHierarchy.js ---
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '@/utils/axios';

/* -------------------------------------------------------------
 * Minimal CRUD wrapper using your lib/axios.js instance
 * ----------------------------------------------------------- */
export const CRUD = {
  get: (url, params) => api.get(url, { params }).then(r => r.data),
  post: (url, body) => api.post(url, body).then(r => r.data),
  put: (url, body) => api.put(url, body).then(r => r.data),
  delete: url => api.delete(url).then(r => r.data),
};

/* -------------------------------------------------------------
 * Internal helper: stable query state with setters
 * ----------------------------------------------------------- */
function useQueryState(initial = { page: 1, limit: 20, search: '' }) {
  const [page, setPage] = useState(Number(initial.page || 1));
  const [limit, setLimit] = useState(Number(initial.limit || 20));
  const [search, setSearch] = useState(String(initial.search || ''));

  // Keep values safe
  const safe = useMemo(
    () => ({
      page: Math.max(1, Number(page || 1)),
      limit: Math.min(100, Math.max(1, Number(limit || 20))),
      search: (search || '').trim(),
    }),
    [page, limit, search],
  );

  return { ...safe, setPage, setLimit, setSearch };
}

/* -------------------------------------------------------------
 * Internal helper: generic fetcher hook
 * - urlBuilder: (q) => string
 * - enabled: boolean (don’t call if false)
 * ----------------------------------------------------------- */
function useListFetcher(urlBuilder, initialQuery = {}, enabled = true) {
  const { page, limit, search, setPage, setLimit, setSearch } = useQueryState(initialQuery);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetcher = useCallback(
    async opts => {
      if (!enabled) return;
      setLoading(true);
      setError(null);

      // cancel any in-flight request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const url = urlBuilder({ page, limit, search, ...(opts || {}) });
        const data = await CRUD.get(url, { page, limit, search });
        setItems(data.items || data.users || []); // tolerate different payloads
        setTotal(Number(data.total || 0));
        setTotalPages(Number(data.totalPages || 0));
      } catch (e) {
        // ignore abort errors
        if (e?.name !== 'CanceledError' && e?.code !== 'ERR_CANCELED') {
          setError(e);
        }
      } finally {
        setLoading(false);
      }
    },
    [enabled, page, limit, search, urlBuilder],
  );

  // refetch on query change
  useEffect(() => {
    fetcher();
    // cleanup on unmount
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetcher]);

  const refetch = useCallback(() => fetcher(), [fetcher]);

  return {
    items,
    total,
    page,
    totalPages,
    loading,
    error,
    setPage,
    setLimit,
    setSearch,
    refetch,
  };
}

/* -------------------------------------------------------------
 * Hook: Coaches under an Admin
 * GET /auth/admin/:adminId/coaches?page=&limit=&search=
 * ----------------------------------------------------------- */
export function useAdminCoaches(adminId, initial = { page: 1, limit: 20, search: '' }) {
  const enabled = Boolean(adminId);
  const urlBuilder = useCallback(() => `/auth/admin/${adminId}/coaches`, [adminId]);
  return useListFetcher(urlBuilder, initial, enabled);
}

/* -------------------------------------------------------------
 * Hook: Clients under an Admin
 * GET /auth/admin/:adminId/clients?page=&limit=&search=
 * ----------------------------------------------------------- */
export function useAdminClients(adminId, initial = { page: 1, limit: 20, search: '' }) {
  const enabled = Boolean(adminId);
  const urlBuilder = useCallback(() => `/auth/admin/${adminId}/clients`, [adminId]);
  return useListFetcher(urlBuilder, initial, enabled);
}

/* -------------------------------------------------------------
 * Hook: Clients under a Coach
 * GET /auth/coach/:coachId/clients?page=&limit=&search=
 * - If you pass null/undefined for coachId and current user is COACH,
 *   it will try to use the logged-in user's id from localStorage.
 * ----------------------------------------------------------- */
export function useCoachClients(coachIdOrNull, initial = { page: 1, limit: 20, search: '' }) {
  // Resolve coachId from localStorage if not provided and current user is a coach
  const resolvedCoachId = useMemo(() => {
    if (coachIdOrNull) return coachIdOrNull;
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (!raw) return null;
      const u = JSON.parse(raw);
      if (u?.role === 'coach' && u?.id) return u.id;
    } catch (_) {}
    return null;
  }, [coachIdOrNull]);

  const enabled = Boolean(resolvedCoachId);
  const urlBuilder = useCallback(() => `/auth/coach/${resolvedCoachId}/clients`, [resolvedCoachId]);

  return useListFetcher(urlBuilder, initial, enabled);
}

/* -------------------------------------------------------------
 * Optional: Admin overview (counts + samples)
 * GET /auth/admin/:adminId/overview  (if you added it)
 * ----------------------------------------------------------- */
export function useAdminOverview(adminId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(adminId));
  const [error, setError] = useState(null);

  const fetchOverview = useCallback(async () => {
    if (!adminId) return;
    setLoading(true);
    setError(null);
    try {
      const out = await CRUD.get(`/auth/admin/${adminId}/overview`);
      setData(out);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return { data, loading, error, refetch: fetchOverview };
}
