'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Bell, User as UserIcon, UserRound, Settings, LogOut, Sparkles, Check, CheckCheck, X, Inbox, Loader2, Search, Filter } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { Link, useRouter } from '@/i18n/navigation';
import io from 'socket.io-client';
import api from '@/utils/axios';

/* ----------------------------- helpers ---------------------------------- */
function initialsFrom(name, email) {
  const src = (name && name.trim()) || (email && email.split('@')[0]) || 'G';
  const parts = src.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}
function fmtRole(role) {
  if (!role) return 'Guest';
  return role[0].toUpperCase() + role.slice(1);
}
function timeAgo(iso) {
  try {
    const then = new Date(iso);
    const diff = Math.max(0, Date.now() - then.getTime());
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  } catch {
    return '—';
  }
}
const roleStyles = role => {
  const r = (role || '').toLowerCase();
  if (r === 'admin') return 'text-rose-700 border-rose-200 bg-rose-50/70';
  if (r === 'coach') return 'text-indigo-700 border-indigo-200 bg-indigo-50/70';
  if (r === 'client') return 'text-emerald-700 border-emerald-200 bg-emerald-50/70';
  return 'text-slate-700 border-slate-200 bg-slate-50/70';
};

function normalizeList(src) {
  if (!src) return [];
  if (Array.isArray(src)) return src;
  if (src && Array.isArray(src.items)) return src.items;
  if (src && Array.isArray(src.data)) return src.data; // common shape
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
function groupByDay(items = []) {
  const map = new Map();
  items.forEach(n => {
    const key = dayKey(n.created_at || n.createdAt || n.createdAtUtc || n.updated_at || n.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(n);
  });
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, list]) => ({ date, list }));
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

function fmtLocal(iso, locale = 'en-EG', tz = 'Africa/Cairo') {
  try {
    return new Date(iso).toLocaleTimeString(locale, {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: undefined, // hide seconds; change to '2-digit' if you want them
      hour12: true,     // use 24-hour format
    });
  } catch {
    return '';
  }
}

// --- skeleton row
function RowSkeleton() {
  return (
    <div className='p-4'>
      <div className='flex gap-3'>
        <div className='h-4 w-4 rounded-full bg-slate-200 animate-pulse' />
        <div className='flex-1 space-y-2'>
          <div className='h-3 w-2/3 rounded bg-slate-200 animate-pulse' />
          <div className='h-3 w-5/6 rounded bg-slate-200 animate-pulse' />
          <div className='h-3 w-1/3 rounded bg-slate-200 animate-pulse' />
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Notifications UI --------------------------- */
export function Notifications({ open, onClose, toggleNotif, notifOpen }) {
  const {
    items: liveItems, // array or {items:[]}
    unread: liveUnread,
    loading: liveLoading,
    markAsRead: liveMarkAsRead,
    markAllRead: liveMarkAllRead,
    loadPage,
    refetch,
  } = useLiveNotifications({ pageSize: 15 });

  // normalized list from API
  const apiList = useMemo(() => normalizeList(liveItems), [liveItems]);

  // optimistic overlay: ids we've marked read locally
  const [optimisticRead, setOptimisticRead] = useState(() => new Set());

  // local UI state (tabs/search/filter/pagination)
  const [tab, setTab] = useState('all'); // 'all' | 'unread'
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' or n.type
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [extraItems, setExtraItems] = useState([]); // pages >1

  // reset extras when base list changes (fresh fetch)
  useEffect(() => {
    setExtraItems([]);
    setPage(1);
    setHasMore(true);
    setOptimisticRead(new Set());
  }, [apiList.length]);

  const baseItems = useMemo(() => apiList.concat(extraItems), [apiList, extraItems]);

  // derive items merged with optimistic flags
  const items = useMemo(
    () =>
      baseItems.map(n => ({
        ...n,
        isRead: n.isRead || optimisticRead.has(n.id),
      })),
    [baseItems, optimisticRead],
  );

  // filter by tab, query, type
  const filtered = useMemo(() => {
    let arr = items;
    if (tab === 'unread') arr = arr.filter(n => !n.isRead);
    if (typeFilter !== 'all') arr = arr.filter(n => (n.type || '').toLowerCase() === typeFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(n => {
        return (n.title || '').toLowerCase().includes(q) || (n.message || '').toLowerCase().includes(q) || (n.type || '').toLowerCase().includes(q);
      });
    }
    return arr;
  }, [items, tab, query, typeFilter]);

  // unread count
  const unreadCount = useMemo(() => {
    if (typeof liveUnread === 'number') {
      // adjust by optimistic marks only if those ids are visible in combined lists
      let optimisticHits = 0;
      for (const id of optimisticRead) {
        const exists = items.find(x => x.id === id);
        if (exists) optimisticHits += 1;
      }
      return Math.max(0, liveUnread - optimisticHits);
    }
    return items.reduce((acc, n) => (n.isRead ? acc : acc + 1), 0);
  }, [items, liveUnread, optimisticRead]);

  const loading = !!liveLoading;

  // actions
  const markAsRead = async id => {
    // optimistic
    setOptimisticRead(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      await liveMarkAsRead?.(id);
    } catch {
      // rollback on failure
      setOptimisticRead(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const markAllRead = async () => {
    // optimistic: mark all currently filtered (so UX feels instant)
    setOptimisticRead(prev => {
      const next = new Set(prev);
      for (const n of filtered) next.add(n.id);
      return next;
    });
    try {
      await liveMarkAllRead?.();
      refetch?.();
    } catch {
      // if server fails, we still keep optimistic state for better UX
    }
  };

  const onLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const newList = await loadPage?.(nextPage);
      const normalized = normalizeList(newList);
      if (!normalized.length) {
        setHasMore(false);
      } else {
        setExtraItems(prev => prev.concat(normalized));
        setPage(nextPage);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  // close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = e => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // gather available types for filter chip
  const typeOptions = useMemo(() => {
    const set = new Set(items.map(n => (n.type || '').toLowerCase()).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [items]);

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  return (
    <AnimatePresence>
      {/* Bell button */}
      <button className='relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition' onClick={toggleNotif} aria-haspopup='dialog' aria-expanded={notifOpen} aria-label='Open notifications' title='Notifications'>
        <Bell className='size-5 text-slate-700' />
        {unreadCount > 0 && <span className='absolute -right-1 -top-1 min-w-[18px] h-[18px] rounded-full px-1.5 text-[11px] grid place-items-center text-white bg-rose-500'>{unreadCount}</span>}
      </button>

      {/* Panel */}
      {open && (
        <>
          <motion.div className='fixed inset-0 z-[60]' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div role='dialog' aria-label='Notifications' className='absolute right-0 top-10 z-[70] w-[460px] max-w-[95vw] rounded-lg border border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-2xl ring-1 ring-slate-900/5 overflow-hidden' initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }}>
            {/* Header */}
            <div className='px-4 pt-3 pb-2 border-b border-slate-100 bg-gradient-to-br from-indigo-50/70 to-white'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2 font-semibold text-slate-800'>
                  <div className='relative'>
                    <Bell className='size-4 text-indigo-700' />
                    {unreadCount > 0 && <span className='absolute -right-2 -top-2 min-w-[18px] h-[18px] rounded-full px-1.5 text-[11px] grid place-items-center text-white bg-rose-500'>{unreadCount}</span>}
                  </div>
                  <span>Notifications</span>
                </div>

                <div className='flex items-center gap-1'>
                  <button onClick={markAllRead} className='inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50'>
                    <CheckCheck className='size-3.5' />
                    Mark all
                  </button>
                  <button onClick={onClose} className='inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 hover:bg-slate-50' aria-label='Close' title='Close'>
                    <X className='size-4' />
                  </button>
                </div>
              </div>

              {/* Tabs + Search/Filter Row */}
              <div className='mt-3 flex items-center gap-2'>
                <div className='flex bg-white border border-slate-200 rounded-lg p-1'>
                  {['all', 'unread'].map(t => (
                    <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm ${tab === t ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                      {t === 'all' ? 'All' : 'Unread'}
                    </button>
                  ))}
                </div>

                <div className='relative flex-1'>
                  <Search className='absolute left-2 top-1/2 -translate-y-1/2 size-4 text-slate-400' />
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder='Search…' className='w-full pl-8 pr-3 h-9 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-200' />
                </div>

                <div className='relative'>
                  <button
                    className='inline-flex items-center gap-1 px-2.5 h-9 rounded-lg border border-slate-200 bg-white text-sm hover:bg-slate-50'
                    onClick={() => {
                      const idx = typeOptions.indexOf(typeFilter);
                      const next = typeOptions[(idx + 1) % typeOptions.length];
                      setTypeFilter(next);
                    }}
                    title='Filter by type'
                    aria-label='Filter by type'>
                    <Filter className='size-4 text-slate-600' />
                    <span className='capitalize'>{typeFilter}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className='max-h-[65vh] overflow-auto'>
              {loading ? (
                <div className='divide-y divide-slate-100'>
                  {[...Array(5)].map((_, i) => (
                    <RowSkeleton key={i} />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className='px-8 py-14 text-center text-slate-500'>
                  <div className='mx-auto mb-3 grid place-items-center size-12 rounded-full bg-slate-100'>
                    <Inbox className='size-6 text-slate-400' />
                  </div>
                  <div className='font-medium text-slate-700 mb-0.5'>No notifications</div>
                  <div className='text-xs'>Try changing the tab, removing the search, or clearing the filter.</div>
                </div>
              ) : (
                <div className='px-1 py-1'>
                  {grouped.map(group => (
                    <div key={group.date} className='px-3'>
                      <div className='sticky top-0 z-10 rounded-lg mb-1 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/50'>
                        <div className='flex items-center gap-2 py-2'>
                          <div className='h-px flex-1 bg-slate-200' />
                          <span className='text-[11px] text-slate-500 px-2'>{prettyDayLabel(group.date)}</span>
                          <div className='h-px flex-1 bg-slate-200' />
                        </div>
                      </div>

                      <ul className='divide-y divide-slate-100 rounded-lg overflow-hidden border border-slate-100 bg-white'>
                        {group.list.map(n => {
                          const unread = !n.isRead;
                          const iconTone = unread ? 'text-indigo-600' : 'text-slate-400';
                          const time = fmtTimeAgo(n.created_at || n.createdAt || n.date);
                          return (
                            <li key={n.id} className={`p-3.5 sm:p-4 ${unread ? 'bg-indigo-50/20 hover:bg-indigo-50/40' : 'hover:bg-slate-50/70'}`}>
                              <div className='flex items-start gap-3'>
                                <div className='mt-0.5'>
                                  <Sparkles className={`size-4 ${iconTone}`} />
                                </div>

                                <div className='flex-1 min-w-0'>
                                  <div className='flex items-center justify-between gap-2'>
                                    <div className='text-sm font-medium text-slate-800 truncate'>{n.title || 'Notification'}</div>
                                    <div className='flex items-center gap-2 shrink-0'>
                                      {n.type ? <span className='text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 capitalize'>{String(n.type).toLowerCase()}</span> : null}
                                      <span className='text-[11px] text-slate-400'>
																				 {fmtLocal(n.created_at)}
																			</span>
                                    </div>
                                  </div>

                                  {n.message ? <div className='text-xs text-slate-600 mt-1 whitespace-pre-wrap break-words line-clamp-3'>{n.message}</div> : null}

                                  <div className='mt-2 flex items-center gap-2'>
                                    {unread ? (
                                      <button onClick={() => markAsRead(n.id)} className='text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50' title='Mark as read'>
                                        <Check className='size-3' /> Read
                                      </button>
                                    ) : (
                                      <span className='text-[10px] rounded border border-slate-200 text-slate-500 px-1.5 py-0.5'>Read</span>
                                    )}

                                    {/* Optional CTA if your notification has action/link */}
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
                        })}
                      </ul>
                    </div>
                  ))}

                  {/* Load More */}
                  {hasMore && (
                    <div className='px-4 py-3'>
                      <button onClick={onLoadMore} className='w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg border border-slate-200 bg-white text-sm hover:bg-slate-50' disabled={loadingMore}>
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

            {/* Footer */}
            <div className='px-4 py-2 border-t border-slate-100 bg-white/70 text-[11px] text-slate-500 flex items-center justify-between'>
              <div className='inline-flex items-center gap-1'>
                {loading ? <Loader2 className='size-3 animate-spin' /> : null}
                <span>{loading ? 'Syncing…' : `${filtered.length} shown`}</span>
								<Link className='text-[10px] underline ltr:ml-2 rtl:mr-2 inline-block ' href={"/dashboard/notifications"} > Show All</Link>
              </div>
              <button
                onClick={() => {
                  setQuery('');
                  setTypeFilter('all');
                  setTab('all');
                  refetch?.();
                }}
                className='text-[11px] underline underline-offset-2 hover:text-slate-700'>
                Reset & Refresh
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* -------------------------------- Header --------------------------------- */
export default function Header({ onMenu, onProfile = () => console.log('profile'), onSettings = () => console.log('settings') }) {
  const user = useUser?.();

  const router = useRouter();
  const handleLogout = () => {
    try {
      localStorage.removeItem('user'); // more precise than clear('user')
    } catch {}
    router.push('/auth');
  };
  const [notifOpen, setNotifOpen] = useState(false);
  const toggleNotif = () => setNotifOpen(o => !o);

  const avatarText = initialsFrom(user?.name, user?.email);
  const role = fmtRole(user?.role);
  const isActive = (user?.status || '').toLowerCase() === 'active';

  return (
    <div className='sticky top-0 z-40'>
      {/* glass + subtle shadow */}
      <div className='absolute inset-0 bg-gradient-to-b from-white/85 to-white/60 backdrop-blur-xl border-b border-slate-200/70' />
      <div className='absolute inset-x-0 bottom-[-1px] h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent' />

      <div className='relative'>
        <div className='container px-3 sm:px-4'>
          <div className='h-16 grid grid-cols-[auto_1fr_auto] items-center gap-2'>
            {/* left: menu only */}
            <div className='flex items-center gap-2'>
              <button onClick={onMenu} className='lg:hidden inline-flex items-center justify-center size-11 max-md:size-9 rounded-lg border border-slate-200 bg-white hover:shadow-sm active:scale-95 transition' aria-label='Open menu' title='Open menu'>
                <Menu className=' ' />
              </button>
              {/* user block */}
              <div className='flex items-center gap-3'>
                <div className='relative'>
                  <div className=' max-md:size-9 size-11 rounded-lg grid place-content-center font-semibold bg-indigo-600 text-white shadow-sm'>{avatarText}</div>
                  <span className={`absolute -right-0 -bottom-0 size-2.5 rounded-full ring-2 ring-white ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} title={isActive ? 'Online' : 'Offline'} />
                </div>

                <div className='hidden sm:flex flex-col items-start'>
                  <span className='text-sm font-medium leading-4 text-slate-800 max-w-[180px] truncate'>{user?.name || user?.email || 'Guest'}</span>
                  <div className='flex items-center gap-2 mt-[2px]'>
                    {/* role badge (subtle, outlined) */}
                    <span className={`inline-flex items-center gap-1 text-[11px] leading-5 px-1.5 py-0.5 rounded-lg border ${roleStyles(role)}`} title={`Role: ${role}`}>
                      <UserIcon className='size-3.5' />
                      {role}
                    </span>
                    <span className='text-[11px] text-slate-500'>Last login: {user?.lastLogin ? timeAgo(user.lastLogin) : '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div />

            <div className='relative flex items-center gap-2'>
              {/* notifications */}
              <div className='relative -mt-0.5'>
                <div className='relative'>
                  <Notifications toggleNotif={toggleNotif} notifOpen={notifOpen} open={notifOpen} onClose={() => setNotifOpen(false)} />
                </div>
              </div>
              <div className='flex items-center'>
                <button onClick={onProfile} className='inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition' aria-label='Profile' title='Profile'>
                  <UserRound className='size-5 text-slate-700' />
                </button>
                <button onClick={onSettings} className='ml-1 inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition' aria-label='Settings' title='Settings'>
                  <Settings className='size-5 text-slate-700' />
                </button>
                <button onClick={handleLogout} className='ml-1 inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 active:scale-95 transition' aria-label='Sign out' title='Sign out'>
                  <LogOut className='size-5 text-rose-600' />
                </button>
              </div>

              {/* if no user object, show Sign in */}
              {!user && (
                <Link href={'/auth'} onClick={handleLogout} className='ml-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50'>
                  <LogOut className='size-4 rotate-180' />
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------ Notifications data hook ------------------------ */
export function useLiveNotifications({ pageSize = 15 } = {}) {
  const [items, setItems] = useState([]); // ALWAYS an array
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  const fetchInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: listRes }, { data: unreadRes }] = await Promise.all([api.get('/notifications/admin', { params: { page: 1, limit: pageSize } }), api.get('/notifications/unread-count')]);
      const list = normalizeList(listRes?.data ?? listRes);
      setItems(list);
      // use API unread if provided, else compute
      const count = typeof unreadRes?.count === 'number' ? unreadRes.count : list.reduce((a, n) => (n?.isRead ? a : a + 1), 0);
      setUnread(count);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  const connectSocket = useCallback(() => {
    if (socketRef.current) return;
    const baseURL = typeof window !== 'undefined' ? window.location.origin : undefined;
    const socket = io(`${baseURL}/notifications`, {
      transports: ['websocket'],
      withCredentials: false,
    });
    socket.on('connect', () => {});
    socket.on('notification', n => {
      setItems(prev => {
        const arr = Array.isArray(prev) ? prev : normalizeList(prev);
        return [n, ...arr].slice(0, pageSize);
      });
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
    } catch {
      // no-op; UI remains unread if server fails
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all');
      setItems(prev => prev.map(x => ({ ...x, isRead: true })));
      setUnread(0);
    } catch {
      // no-op
    }
  }, []);

  const loadPage = useCallback(
    async (page = 1) => {
      const { data: listRes } = await api.get('/notifications/admin', {
        params: { page, limit: pageSize },
      });
      return normalizeList(listRes?.data ?? listRes);
    },
    [pageSize],
  );

  const refetch = fetchInitial;

  return { items, unread, loading, markAsRead, markAllRead, loadPage, refetch };
}
