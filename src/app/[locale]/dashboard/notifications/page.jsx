'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Inbox, Check, CheckCheck, Loader2, ChevronDown, X, BellRing, ArrowUpRight, Zap, MailOpen, RefreshCw, Filter, Sparkles } from 'lucide-react';
import io from 'socket.io-client';
import { useTranslations, useLocale } from 'next-intl';
import api from '@/utils/axios';

/* ─── helpers ─── */
function normalizeList(src) {
  if (!src) return [];
  if (Array.isArray(src)) return src;
  if (src?.items) return src.items;
  if (src?.data) return src.data;
  return [];
}

function fmtAgo(iso, t) {
  try {
    const m = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return t('time.now');
    if (m < 60) return t('time.minutes', { v: m });
    const h = Math.floor(m / 60);
    if (h < 24) return t('time.hours', { v: h });
    return t('time.days', { v: Math.floor(h / 24) });
  } catch {
    return '';
  }
}

function dayKey(iso) {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

function useDayLabel(iso, t) {
  const d = new Date(iso),
    now = new Date();
  if (dayKey(d.toISOString()) === dayKey(now.toISOString())) return t('day.today');
  if (dayKey(d.toISOString()) === dayKey(new Date(now - 86400000).toISOString())) return t('day.yesterday');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function groupByDay(items = []) {
  const map = new Map();
  items.forEach(n => {
    const k = dayKey(n.created_at || n.createdAt || n.date);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(n);
  });
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([d, l]) => ({ d, l }));
}

const TYPE_STYLE = {
  system: { bg: 'bg-[var(--color-primary-100)]', tx: 'text-[var(--color-primary-700)]' },
  message: { bg: 'bg-emerald-100', tx: 'text-emerald-700' },
  alert: { bg: 'bg-rose-100', tx: 'text-rose-700' },
  info: { bg: 'bg-sky-100', tx: 'text-sky-700' },
  warning: { bg: 'bg-amber-100', tx: 'text-amber-700' },
};
const tStyle = type => TYPE_STYLE[(type || '').toLowerCase()] || { bg: 'bg-slate-100', tx: 'text-slate-500' };

/* ─── data hook ─── */
function useFeed({ pageSize = 30 } = {}) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const sockRef = useRef(null);

  const fetchPage = useCallback(
    async (p = 1) => {
      const { data } = await api.get('/notifications', { params: { page: p, limit: pageSize } });
      return normalizeList(data?.data ?? data);
    },
    [pageSize],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: lRes }, { data: uRes }] = await Promise.all([api.get('/notifications', { params: { page: 1, limit: pageSize } }), api.get('/notifications/unread-count')]);
      const list = normalizeList(lRes?.data ?? lRes);
      setItems(list);
      setUnread(typeof uRes?.count === 'number' ? uRes.count : list.filter(n => !n.isRead).length);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    load();
    if (sockRef.current) return;
    const s = io(`${window.location.origin}/notifications`, { transports: ['websocket'], withCredentials: false });
    s.on('notification', n => {
      setItems(p => [n, ...p].slice(0, Math.max(200, pageSize * 5)));
      setUnread(c => c + (n?.isRead ? 0 : 1));
    });
    sockRef.current = s;
    return () => {
      try {
        sockRef.current?.disconnect();
      } catch {}
      sockRef.current = null;
    };
  }, [load, pageSize]);

  const markRead = useCallback(async id => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems(p => p.map(x => (x.id === id ? { ...x, isRead: true } : x)));
      setUnread(c => Math.max(0, c - 1));
    } catch {}
  }, []);

  const markAll = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all');
      setItems(p => p.map(x => ({ ...x, isRead: true })));
      setUnread(0);
    } catch {}
  }, []);

  return { items, unread, loading, fetchPage, markRead, markAll, refetch: load, setItems };
}

/* ─── skeleton ─── */
function Skel() {
  return (
    <div className='divide-y divide-slate-100'>
      {[...Array(7)].map((_, i) => (
        <div key={i} className='flex items-start gap-3 px-4 py-3'>
          <div className='h-7 w-7 rounded-lg bg-slate-100 animate-pulse flex-shrink-0 mt-0.5' />
          <div className='flex-1 space-y-1.5 pt-0.5'>
            <div className='h-2.5 w-1/3 rounded-full bg-slate-100 animate-pulse' />
            <div className='h-2 w-2/3 rounded-full bg-slate-100 animate-pulse' />
          </div>
          <div className='h-2 w-6 rounded-full bg-slate-100 animate-pulse mt-1' />
        </div>
      ))}
    </div>
  );
}

/* ─── NOTIFICATION ROW ─── */
function Row({ n, onRead, selected, onToggle, t }) {
  const s = tStyle(n.type);
  const unread = !n.isRead;
  const time = fmtAgo(n.created_at || n.createdAt || n.date, t);

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      className={`group relative flex items-start gap-3 px-4 py-2.5 border-b border-slate-100 last:border-0 transition-colors duration-100
        ${unread ? 'bg-[var(--color-primary-50)]/60 hover:bg-[var(--color-primary-100)]/40' : 'hover:bg-slate-50/50'}`}>
      {/* unread strip */}
      {unread && <div className='absolute inset-y-0 start-0 w-[3px] rounded-e-full bg-[var(--color-primary-500)]' />}

      {/* checkbox on hover */}
      <div
        onClick={e => {
          e.stopPropagation();
          onToggle?.(n.id);
        }}
        className={`absolute start-1.5 top-3 h-[15px] w-[15px] rounded border-[1.5px] items-center justify-center cursor-pointer transition-all
          hidden group-hover:flex
          ${selected ? '!flex border-[var(--color-primary-500)] bg-[var(--color-primary-500)]' : 'border-slate-300 bg-white'}`}>
        {selected && <Check className='h-2 w-2 text-white' strokeWidth={3} />}
      </div>

      {/* type icon */}
      <div className={`flex-shrink-0 h-7 w-7 rounded-lg ${s.bg} flex items-center justify-center mt-0.5`}>
        <Sparkles className={`h-3 w-3 ${s.tx}`} />
      </div>

      {/* content: title on top, description below */}
      <div className='flex-1 min-w-0'>
        <div className='flex items-start justify-between gap-2'>
          <p className={`text-[12.5px] leading-snug ${unread ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'}`}>{n.title || t('row.defaultTitle')}</p>
          {/* time + type badge */}
          <div className='flex items-center gap-1.5 flex-shrink-0 mt-0.5'>
            {/* action row */}
            {n.type && <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full hidden sm:inline-flex ${s.bg} ${s.tx}`}>{n.type}</span>}
            <div className='flex items-center gap-2 '>
              {unread ? (
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => onRead?.(n.id)} className='inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors' style={{ borderColor: 'var(--color-primary-200)', color: 'var(--color-primary-700)', background: 'var(--color-primary-50)' }}>
                  <Check className='h-2.5 w-2.5' strokeWidth={3} /> {t('row.markRead')}
                </motion.button>
              ) : (
                <span className='inline-flex items-center gap-1 text-[10px] text-slate-400 px-2 py-0.5 rounded-full bg-slate-100'>
                  <MailOpen className='h-2.5 w-2.5' /> {t('row.read')}
                </span>
              )}
              {n.url && (
                <a href={n.url} className='inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-400 hover:text-[var(--color-primary-600)] transition-colors'>
                  {t('row.open')} <ArrowUpRight className='h-2.5 w-2.5' />
                </a>
              )}
            </div>

            <span className='text-[10px] text-slate-400 tabular-nums'>{time}</span>
          </div>
        </div>

        {/* description row */}
        {n.message && <p className='text-[11.5px] mt-[-4px] text-slate-500 leading-relaxed line-clamp-1 '>{n.message}</p>}
      </div>
    </motion.div>
  );
}

/* ─── type dropdown ─── */
function TypeMenu({ value, options, onChange, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const fn = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} className='relative'>
      <button onClick={() => setOpen(o => !o)} className='inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors' style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <Filter className='h-3 w-3 text-slate-400' />
        <span>{value === 'all' ? t('filter.all') : value}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.12 }}>
          <ChevronDown className='h-3 w-3 text-slate-400' />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.11 }} className='absolute end-0 mt-1 w-32 rounded-xl border border-slate-200 bg-white z-20 overflow-hidden py-1' style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`w-full text-start px-3 py-1.5 text-[11px] font-medium flex items-center gap-1.5 hover:bg-slate-50 transition-colors
                  ${opt === value ? 'text-[var(--color-primary-700)]' : 'text-slate-600'}`}>
                {opt === value && <div className='h-1.5 w-1.5 rounded-full bg-[var(--color-primary-500)] flex-shrink-0' />}
                {opt === 'all' ? t('filter.allTypes') : opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Day label component ─── */
function DayLabel({ iso, t }) {
  const label = useDayLabel(iso, t);
  return <>{label}</>;
}

/* ─── PAGE ─── */
export default function NotificationsPage() {
  const PAGE = 30;
  const tAll = useTranslations('notifications');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const { items, unread, loading, fetchPage, markRead, markAll, refetch, setItems } = useFeed({ pageSize: PAGE });

  const [page, setPage] = useState(1);
  const [loadMore, setLoadMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [tab, setTab] = useState('all');
  const [type, setType] = useState('all');
  const [sel, setSel] = useState(() => new Set());
  const [spinning, setSpinning] = useState(false);

  const types = useMemo(() => {
    const s = new Set(items.map(n => (n.type || '').toLowerCase()).filter(Boolean));
    return ['all', ...s];
  }, [items]);

  const filtered = useMemo(() => {
    let a = items.slice();
    if (tab === 'unread') a = a.filter(n => !n.isRead);
    if (type !== 'all') a = a.filter(n => (n.type || '').toLowerCase() === type);
    return a;
  }, [items, tab, type]);

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  const toggle = id =>
    setSel(p => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const clearSel = () => setSel(new Set());
  const selAll = () => setSel(new Set(filtered.map(n => n.id)));

  const markSelRead = async () => {
    const ids = [...sel];
    setItems(p => p.map(n => (ids.includes(n.id) ? { ...n, isRead: true } : n)));
    clearSel();
    await Promise.allSettled(ids.map(id => api.patch(`/notifications/${id}/read`)));
    refetch();
  };

  const refresh = async () => {
    setSpinning(true);
    await refetch();
    setTimeout(() => setSpinning(false), 600);
  };

  const more = async () => {
    if (loadMore || !hasMore) return;
    setLoadMore(true);
    try {
      const list = normalizeList(await fetchPage(page + 1));
      if (!list.length) setHasMore(false);
      else {
        setItems(p => [...p, ...list]);
        setPage(p => p + 1);
      }
    } finally {
      setLoadMore(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setHasMore(true);
  }, [tab, type]);

  return (
    <div className='min-h-screen bg-slate-100' dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── HERO HEADER ── */}
      <div className='relative overflow-hidden px-4 sm:px-6 pt-4 pb-4' style={{ background: 'linear-gradient(135deg, var(--color-primary-800) 0%, var(--color-primary-700) 50%, var(--color-secondary-600) 100%)' }}>
        {/* decorative */}
        <div className='absolute -top-10 -start-10 w-44 h-44 rounded-full opacity-20 blur-3xl pointer-events-none' style={{ background: 'radial-gradient(circle, var(--color-primary-400), transparent)' }} />
        <div className='absolute -bottom-8 -end-8 w-36 h-36 rounded-full opacity-15 blur-2xl pointer-events-none' style={{ background: 'radial-gradient(circle, var(--color-secondary-400), transparent)' }} />
        <div className='absolute inset-0 opacity-[0.035] pointer-events-none mix-blend-overlay' style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
        <div className='absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent' />
        <div className='absolute -top-6 -end-6 w-28 h-28 rounded-full border border-white/10 pointer-events-none' />

        <div className='relative z-10 flex items-center justify-between gap-3'>
          {/* icon + title */}
          <div className='flex items-center gap-2.5'>
            <div className='relative'>
              <div className='h-10 w-10 rounded-xl bg-white/[0.15] backdrop-blur-sm flex items-center justify-center' style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25),0 2px 10px rgba(0,0,0,0.12)' }}>
                <BellRing className='h-5 w-5 text-white' />
              </div>
              {unread > 0 && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className='absolute -top-1.5 -end-1.5 min-w-[18px] h-[18px] rounded-full px-1 flex items-center justify-center text-[9px] font-black text-white' style={{ background: 'linear-gradient(135deg,#f43f5e,#e11d48)', boxShadow: '0 2px 6px rgba(244,63,94,.5)' }}>
                  {unread > 99 ? '99+' : unread}
                </motion.div>
              )}
            </div>
            <div>
              <h1 className='text-[15px] font-black text-white leading-tight'>{tAll('header.title')}</h1>
              <p className='text-[10px] text-white/50 font-medium mt-0.5'>{tAll('header.subtitle', { total: items.length, unread })}</p>
            </div>
          </div>

          {/* stats pills — center */}
          <div className='hidden sm:flex items-center gap-2'>
            {[
              { l: tAll('stats.total'), v: items.length },
              { l: tAll('stats.unread'), v: unread },
              { l: tAll('stats.read'), v: items.length - unread },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.04 }} className='rounded-lg px-2.5 py-1.5 bg-white/[0.10] border border-white/15 text-center min-w-[48px]'>
                <p className='text-[8px] text-white/40 font-bold uppercase tracking-wider leading-none mb-0.5'>{s.l}</p>
                <p className='text-[14px] font-black text-white tabular-nums leading-tight'>{s.v}</p>
              </motion.div>
            ))}
          </div>

          {/* actions */}
          <div className='flex items-center gap-1.5'>
            <motion.button whileTap={{ scale: 0.9 }} onClick={refresh} className='h-8 w-8 rounded-xl bg-white/[0.12] flex items-center justify-center text-white/60 hover:bg-white/[0.20] border border-white/15 transition-all' title={tAll('actions.refresh')}>
              <motion.div animate={{ rotate: spinning ? 360 : 0 }} transition={{ duration: 0.55 }}>
                <RefreshCw className='h-3.5 w-3.5' />
              </motion.div>
            </motion.button>
            <motion.button whileTap={{ scale: 0.92 }} onClick={markAll} className='inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-white/[0.12] text-white text-[11px] font-bold border border-white/15 hover:bg-white/[0.20] transition-all' title={tAll('actions.markAllRead')}>
              <CheckCheck className='h-3.5 w-3.5' />
              <span className='hidden sm:inline'>{tAll('actions.markAllRead')}</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR: type dropdown LEFT, tabs RIGHT ── */}
      <div className='bg-white border-b border-slate-200 px-4 sm:px-6 py-2' style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className='flex items-center justify-between gap-3'>
          {/* LEFT: type filter dropdown */}
          <TypeMenu value={type} options={types} onChange={setType} t={tAll} />

          {/* RIGHT: all / unread tabs */}
          <div className='flex items-center gap-1 bg-slate-100 rounded-lg p-0.5'>
            {[
              ['all', tAll('tabs.all')],
              ['unread', tAll('tabs.unread')],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className='relative h-7 px-3.5 rounded-md text-[11px] font-bold transition-all'
                style={
                  tab === k
                    ? {
                        background: 'var(--color-primary-600)',
                        color: 'white',
                        boxShadow: '0 1px 4px var(--color-primary-400,rgba(99,102,241,.3))',
                      }
                    : {
                        background: 'transparent',
                        color: 'var(--color-primary-600)',
                      }
                }>
                {l}
                {k === 'unread' && unread > 0 && (
                  <span className='absolute -top-0.5 -end-0.5 min-w-[14px] h-[14px] rounded-full text-[8px] font-black text-white flex items-center justify-center px-0.5' style={{ background: '#f43f5e' }}>
                    {unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BULK BAR ── */}
      <AnimatePresence>
        {sel.size > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className='overflow-hidden border-b border-slate-200'>
            <div className='flex items-center justify-between gap-2 px-4 sm:px-6 py-1.5' style={{ background: 'var(--color-primary-50)' }}>
              <p className='text-[11px] font-bold' style={{ color: 'var(--color-primary-700)' }}>
                {tAll('bulk.selected', { count: sel.size })}
              </p>
              <div className='flex items-center gap-1.5'>
                <button onClick={markSelRead} className='inline-flex items-center gap-1 text-[10px] font-bold h-6 px-2.5 rounded-lg border transition-colors' style={{ borderColor: 'var(--color-primary-300)', color: 'var(--color-primary-700)', background: 'white' }}>
                  <Check className='h-2.5 w-2.5' strokeWidth={3} /> {tAll('bulk.markRead')}
                </button>
                <button onClick={selAll} className='text-[10px] font-bold h-6 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors'>
                  {tAll('bulk.selectAll')}
                </button>
                <button onClick={clearSel} className='h-6 w-6 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors'>
                  <X className='h-2.5 w-2.5' />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LIST ── */}
      <div className='bg-white' style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <Skel />
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='py-14 text-center'>
            <div className='mx-auto mb-2.5 h-10 w-10 rounded-xl flex items-center justify-center' style={{ background: 'var(--color-primary-100)' }}>
              <Inbox className='h-4.5 w-4.5' style={{ color: 'var(--color-primary-500)' }} />
            </div>
            <p className='font-semibold text-slate-700 text-[13px] mb-1'>{tAll('empty.title')}</p>
            <p className='text-[11px] text-slate-400'>{tAll('empty.desc')}</p>
          </motion.div>
        ) : (
          <AnimatePresence mode='popLayout'>
            {grouped.map(({ d, l }, gi) => (
              <motion.div key={d} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: gi * 0.02 }}>
                {/* day divider */}
                <div className='sticky top-0 z-10 flex items-center gap-2 px-4 py-1.5' style={{ background: 'rgba(248,250,252,0.95)', backdropFilter: 'blur(4px)', borderBottom: '1px solid rgba(226,232,240,0.5)' }}>
                  <div className='h-px flex-1' style={{ background: 'linear-gradient(to right, var(--color-primary-200), transparent)' }} />
                  <span className='text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border' style={{ color: 'var(--color-primary-600)', background: 'var(--color-primary-50)', borderColor: 'var(--color-primary-200)' }}>
                    <DayLabel iso={d} t={tAll} />
                  </span>
                  <div className='h-px flex-1' style={{ background: 'linear-gradient(to left, var(--color-primary-200), transparent)' }} />
                </div>

                <AnimatePresence>
                  {l.map(n => (
                    <Row key={n.id} n={n} onRead={markRead} selected={sel.has(n.id)} onToggle={toggle} t={tAll} />
                  ))}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* footer */}
        {!loading && filtered.length > 0 && (
          <div className='flex items-center justify-between gap-2 px-4 sm:px-6 py-2.5 border-t border-slate-100'>
            <button onClick={selAll} className='text-[11px] font-semibold px-3 py-1 rounded-full border transition-colors' style={{ color: 'var(--color-primary-600)', borderColor: 'var(--color-primary-200)', background: 'var(--color-primary-50)' }}>
              {tAll('footer.selectAll', { count: filtered.length })}
            </button>
            {hasMore && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={more}
                disabled={loadMore}
                className='inline-flex items-center gap-1.5 text-[11px] font-bold h-7 px-3.5 rounded-full transition-all disabled:opacity-50'
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700))',
                  color: 'white',
                  boxShadow: '0 2px 8px var(--color-primary-400,rgba(99,102,241,.3))',
                }}>
                {loadMore ? (
                  <>
                    <Loader2 className='h-3 w-3 animate-spin' /> {tAll('footer.loading')}
                  </>
                ) : (
                  <>
                    <Zap className='h-3 w-3' /> {tAll('footer.loadMore')}
                  </>
                )}
              </motion.button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
