'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Inbox, Search, Filter, Check, CheckCheck, Loader2, Sparkles, ChevronDown, X } from 'lucide-react';
import io from 'socket.io-client';
import api from '@/utils/axios';

/* ----------------------------- helpers ---------------------------------- */
function normalizeList(src) {
  if (!src) return [];
  if (Array.isArray(src)) return src;
  if (src && Array.isArray(src.items)) return src.items;
  if (src && Array.isArray(src.data)) return src.data;
  return [];
}
function fmtTimeAgo(iso) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
  } catch {
    return '';
  }
}
function fmtLocalTime(iso, locale = 'en-EG', tz = 'Africa/Cairo') {
  try {
    return new Date(iso).toLocaleTimeString(locale, {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
}
function dayKey(iso) {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  } catch {
    return 'Unknown';
  }
}
function prettyDayLabel(isoLike) {
  const today = new Date();
  const d = new Date(isoLike);
  const tKey = dayKey(today.toISOString());
  const dKey = dayKey(d.toISOString());
  const y = new Date(today.getTime() - 86400000);
  const yKey = dayKey(y.toISOString());
  if (dKey === tKey) return 'Today';
  if (dKey === yKey) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function groupByDay(items = []) {
  const map = new Map();
  items.forEach(n => {
    const key = dayKey(n.created_at || n.createdAt || n.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(n);
  });
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, list]) => ({ date, list }));
}

/* ------------------------ Notifications data hook ------------------------ */
function useNotificationsFeed({ pageSize = 20 } = {}) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  const fetchPage = useCallback(
    async (page = 1) => {
      const { data: listRes } = await api.get('/notifications/admin', { params: { page, limit: pageSize } });
      return normalizeList(listRes?.data ?? listRes);
    },
    [pageSize],
  );

  const fetchInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: listRes }, { data: unreadRes }] = await Promise.all([api.get('/notifications/admin', { params: { page: 1, limit: pageSize } }), api.get('/notifications/unread-count')]);
      const list = normalizeList(listRes?.data ?? listRes);
      setItems(list);
      const count = typeof unreadRes?.count === 'number' ? unreadRes.count : list.reduce((a, n) => (n?.isRead ? a : a + 1), 0);
      setUnread(count);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  const connectSocket = useCallback(() => {
    if (socketRef.current) return;
    const baseURL = typeof window !== 'undefined' ? window.location.origin : '';
    const socket = io(`${baseURL}/notifications`, { transports: ['websocket'], withCredentials: false });
    socket.on('notification', n => {
      setItems(prev => [n, ...prev].slice(0, Math.max(100, pageSize * 3))); // keep a buffer
      setUnread(c => c + (n?.isRead ? 0 : 1));
    });
    socketRef.current = socket;
  }, [pageSize]);

  useEffect(() => {
    fetchInitial();
    connectSocket();
    return () => {
      try {
        socketRef.current?.disconnect();
      } catch {}
      socketRef.current = null;
    };
  }, [fetchInitial, connectSocket]);

  const markAsRead = useCallback(async id => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems(prev => prev.map(x => (x.id === id ? { ...x, isRead: true } : x)));
      setUnread(c => Math.max(0, c - 1));
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all');
      setItems(prev => prev.map(x => ({ ...x, isRead: true })));
      setUnread(0);
    } catch {}
  }, []);

  const refetch = fetchInitial;

  return { items, unread, loading, fetchPage, markAsRead, markAllRead, refetch, setItems, setUnread };
}

/* --------------------------- UI Components --------------------------- */
function TypeDropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className='relative'>
      <button className='inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm hover:bg-slate-50' onClick={() => setOpen(o => !o)}>
        <Filter className='size-4 text-slate-600' />
        <span className='capitalize'>{value}</span>
        <ChevronDown className='size-4 text-slate-500' />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} className='absolute right-0 mt-2 w-40 rounded-lg border border-slate-200 bg-white shadow-lg z-10 overflow-hidden'>
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 capitalize ${opt === value ? 'bg-slate-50' : ''}`}>
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationRow({ n, onRead }) {
  const unread = !n.isRead;
  const time = fmtTimeAgo(n.created_at || n.createdAt || n.date);
  const timeAbs = fmtLocalTime(n.created_at || n.createdAt || n.date);

  return (
    <li className={`p-4 ${unread ? 'bg-indigo-50/20 hover:bg-indigo-50/40' : 'hover:bg-slate-50/60'}`}>
      <div className='flex items-start gap-3'>
        <div className='mt-0.5'>
          <Sparkles className={`size-4 ${unread ? 'text-indigo-600' : 'text-slate-400'}`} />
        </div>

        <div className='flex-1 min-w-0'>
          <div className='flex items-center justify-between gap-2'>
            <div className='text-sm font-medium text-slate-800 truncate'>{n.title || 'Notification'}</div>
            <div className='flex items-center gap-2 shrink-0'>
              {n.type ? <span className='text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 capitalize'>{String(n.type).toLowerCase()}</span> : null}
              <span className='text-[11px] text-slate-400' title={timeAbs}>
                {time}
              </span>
            </div>
          </div>

          {n.message ? <div className='text-xs text-slate-600 mt-1 whitespace-pre-wrap break-words'>{n.message}</div> : null}

          <div className='mt-2 flex items-center gap-2'>
            {unread ? (
              <button onClick={() => onRead?.(n.id)} className='text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50' title='Mark as read'>
                <Check className='size-3' /> Read
              </button>
            ) : (
              <span className='text-[10px] rounded border border-slate-200 text-slate-500 px-1.5 py-0.5'>Read</span>
            )}

            {n.url ? (
              <a href={n.url} className='text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 text-slate-700 hover:bg-slate-50'>
                Open
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

/* ------------------------------ Page View ------------------------------ */
export default function NotificationsPage() {
  const PAGE_SIZE = 20;
  const { items, unread, loading, fetchPage, markAsRead, markAllRead, refetch, setItems } = useNotificationsFeed({ pageSize: PAGE_SIZE });

  // pagination
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // filters
  const [tab, setTab] = useState('all'); // all | unread
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState(() => new Set()); // bulk select ids

  // available types
  const typeOptions = useMemo(() => {
    const set = new Set(items.map(n => (n.type || '').toLowerCase()).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [items]);

  // filtered array
  const filtered = useMemo(() => {
    let arr = items.slice();
    if (tab === 'unread') arr = arr.filter(n => !n.isRead);
    if (typeFilter !== 'all') arr = arr.filter(n => (n.type || '').toLowerCase() === typeFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(n => (n.title || '').toLowerCase().includes(q) || (n.message || '').toLowerCase().includes(q) || (n.type || '').toLowerCase().includes(q));
    }
    return arr;
  }, [items, tab, query, typeFilter]);

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  // bulk select helpers
  const toggleSelect = id => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());
  const selectAllVisible = () => setSelected(new Set(filtered.map(n => n.id)));

  const markSelectedRead = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    // optimistic
    setItems(prev => prev.map(n => (ids.includes(n.id) ? { ...n, isRead: true } : n)));
    clearSelection();
    // fire sequentially (or batch if your API supports)
    await Promise.allSettled(ids.map(id => api.patch(`/notifications/${id}/read`)));
    refetch(); // sync counts
  };

  const onLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const newList = await fetchPage?.(nextPage);
      const normalized = normalizeList(newList);
      if (!normalized.length) {
        setHasMore(false);
      } else {
        setItems(prev => prev.concat(normalized));
        setPage(nextPage);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  // reset pagination when filters change
  useEffect(() => {
    setPage(1);
    setHasMore(true);
  }, [tab, query, typeFilter]);

  return (
    <div className='min-h-screen bg-slate-50'>
      <div className='container !px-0 py-8'>
        {/* Header */}
        <div className='flex items-center justify-between mb-6'>
          <div className='flex items-center gap-3'>
            <div className='relative'>
              <Bell className='size-6 text-indigo-700' />
              {unread > 0 && <span className='absolute -right-2 -top-2 min-w-[20px] h-[20px] rounded-full px-1.5 text-[11px] grid place-items-center text-white bg-rose-500'>{unread}</span>}
            </div>
            <h1 className='text-xl font-semibold text-slate-800'>All Notifications</h1>
          </div>

          <div className='flex items-center gap-2'>
            <button onClick={markAllRead} className='inline-flex items-center gap-1 text-sm px-3 h-10 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50' title='Mark all as read'>
              <CheckCheck className='size-4' />
              Mark all
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className='flex flex-col sm:flex-row sm:items-center gap-3 mb-5'>
          <div className='flex bg-white border border-slate-200 rounded-lg p-1 w-fit'>
            {['all', 'unread'].map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 rounded-lg text-sm ${tab === t ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                {t === 'all' ? 'All' : 'Unread'}
              </button>
            ))}
          </div>

          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400' />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder='Search notifications…' className='w-full pl-9 pr-3 h-10 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-200' />
          </div>

          <TypeDropdown value={typeFilter} options={typeOptions} onChange={setTypeFilter} />
        </div>

        {/* Bulk actions bar */}
        <AnimatePresence>
          {selected.size > 0 && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className='mb-4 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-2 flex items-center justify-between'>
              <div className='text-sm text-indigo-800'>
                Selected <span className='font-semibold'>{selected.size}</span> item(s)
              </div>
              <div className='flex items-center gap-2'>
                <button onClick={markSelectedRead} className='inline-flex items-center gap-1 text-sm px-3 h-9 rounded-lg border border-indigo-300 text-indigo-800 hover:bg-white'>
                  <Check className='size-4' /> Mark as read
                </button>
                <button onClick={clearSelection} className='inline-flex items-center gap-1 text-sm px-3 h-9 rounded-lg border border-slate-200 text-slate-700 hover:bg-white'>
                  <X className='size-4' /> Clear
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List */}
        <div className='rounded-lg border border-slate-200 bg-white overflow-hidden'>
          {loading ? (
            <div className='divide-y divide-slate-100'>
              {[...Array(7)].map((_, i) => (
                <div key={i} className='p-4'>
                  <div className='flex gap-3'>
                    <div className='h-4 w-4 rounded-full bg-slate-200 animate-pulse' />
                    <div className='flex-1 space-y-2'>
                      <div className='h-3 w-2/3 rounded bg-slate-200 animate-pulse' />
                      <div className='h-3 w-5/6 rounded bg-slate-200 animate-pulse' />
                      <div className='h-3 w-1/3 rounded bg-slate-200 animate-pulse' />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className='px-8 py-20 text-center text-slate-500'>
              <div className='mx-auto mb-3 grid place-items-center size-14 rounded-full bg-slate-100'>
                <Inbox className='size-7 text-slate-400' />
              </div>
              <div className='font-medium text-slate-700 mb-0.5'>Nothing here</div>
              <div className='text-sm'>Try changing the tab, search, or filter type.</div>
            </div>
          ) : (
            <div className='px-2 py-2'>
              {grouped.map(group => (
                <section key={group.date} className='mb-3 last:mb-0'>
                  <div className='sticky top-0 z-10 bg-white'>
                    <div className='flex items-center gap-2 py-2 px-2'>
                      <div className='h-px flex-1 bg-slate-200' />
                      <span className='text-[11px] text-slate-500 px-2'>{prettyDayLabel(group.date)}</span>
                      <div className='h-px flex-1 bg-slate-200' />
                    </div>
                  </div>

                  <ul className='divide-y divide-slate-100 rounded-lg border border-slate-100 overflow-hidden'>
                    {group.list.map(n => (
                      <div key={n.id} className='relative'>
                        {/* Checkbox for bulk select */}
                        <label className='absolute left-2 top-4 z-10'>
                          <input type='checkbox' className='peer size-4 rounded border-slate-300 text-indigo-600' checked={selected.has(n.id)} onChange={() => toggleSelect(n.id)} />
                        </label>
                        <div className='pl-8'>
                          <NotificationRow n={n} onRead={markAsRead} />
                        </div>
                      </div>
                    ))}
                  </ul>
                </section>
              ))}

              {/* Select all visible */}
              <div className='px-2 pt-1 pb-3 flex items-center gap-2'>
                <button onClick={selectAllVisible} className='text-[12px] px-2 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50'>
                  Select all shown
                </button>
                <span className='text-[12px] text-slate-400'>({filtered.length})</span>
              </div>

              {/* Load More */}
              {hasMore && (
                <div className='px-3 pb-4'>
                  <button onClick={onLoadMore} className='w-full inline-flex items-center justify-center gap-2 h-10 rounded-lg border border-slate-200 bg-white text-sm hover:bg-slate-50' disabled={loadingMore}>
                    {loadingMore ? (
                      <>
                        <Loader2 className='size-4 animate-spin' />
                        Loading…
                      </>
                    ) : (
                      'Load more'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
