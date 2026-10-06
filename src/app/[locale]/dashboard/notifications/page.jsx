'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Inbox, Check, CheckCheck, Loader2, ChevronDown, X, ArrowUpRight, Zap, MailOpen, RefreshCw, Filter, Sparkles } from 'lucide-react';
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
  system: { bg: 'bg-[color-mix(in_srgb,var(--color-primary-500)_16%,transparent)]', tx: 'text-[var(--color-primary-700)] dark:text-[var(--color-primary-200)]' },
  message: { bg: 'bg-emerald-500/15', tx: 'text-emerald-700 dark:text-emerald-300' },
  alert: { bg: 'bg-rose-500/15', tx: 'text-rose-700 dark:text-rose-300' },
  info: { bg: 'bg-sky-500/15', tx: 'text-sky-700 dark:text-sky-300' },
  warning: { bg: 'bg-amber-500/15', tx: 'text-amber-700 dark:text-amber-300' },
};
const tStyle = type => TYPE_STYLE[(type || '').toLowerCase()] || { bg: 'bg-[color-mix(in_srgb,var(--gm-ink)_8%,transparent)]', tx: 'gm-muted' };

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
    <div className='divide-y divide-(--gm-line)'>
      {[...Array(7)].map((_, i) => (
        <div key={i} className='flex items-start gap-3 px-4 py-3'>
          <div className='gm-skel mt-0.5 size-7 shrink-0 rounded-lg' />
          <div className='flex-1 space-y-1.5 pt-0.5'>
            <div className='gm-skel h-2.5 w-1/3 rounded-full' />
            <div className='gm-skel h-2 w-2/3 rounded-full' />
          </div>
          <div className='gm-skel mt-1 h-2 w-6 rounded-full' />
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
      className={`group relative mb-2 flex items-start gap-3 rounded-2xl border border-white/80 px-3 py-3 shadow-[3px_3px_6px_rgba(100,116,139,0.18)] ${unread ? 'bg-[#e7efff]' : 'bg-[#eef2f9]'}`}>
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
          ${selected ? '!flex border-[var(--color-primary-500)] bg-[var(--color-primary-500)]' : 'border-(--gm-line) bg-(--gm-paper)'}`}>
        {selected && <Check className='h-2 w-2 text-white' strokeWidth={3} />}
      </div>

      {/* type icon */}
      <div className={`flex-shrink-0 h-7 w-7 rounded-lg ${s.bg} flex items-center justify-center mt-0.5`}>
        <Sparkles className={`h-3 w-3 ${s.tx}`} />
      </div>

      {/* content: title on top, description below */}
      <div className='flex-1 min-w-0'>
        <div className='flex items-start justify-between gap-2'>
          <p className={`text-[13px] leading-snug ${unread ? 'font-semibold gm-ink' : 'font-medium gm-muted'}`}>{n.title || t('row.defaultTitle')}</p>
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
                <span className='inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--gm-ink)_6%,transparent)] px-2 py-0.5 text-[10px] gm-faint'>
                  <MailOpen className='h-2.5 w-2.5' /> {t('row.read')}
                </span>
              )}
              {n.url && (
                <a href={n.url} className='inline-flex items-center gap-0.5 text-[10px] font-medium gm-faint transition-colors hover:text-[var(--color-primary-600)]'>
                  {t('row.open')} <ArrowUpRight className='h-2.5 w-2.5' />
                </a>
              )}
            </div>

            <span className='text-[10px] tabular-nums gm-faint'>{time}</span>
          </div>
        </div>

        {/* description row */}
        {n.message && <p className='mt-0.5 line-clamp-1 text-[12px] leading-relaxed gm-muted'>{n.message}</p>}
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
      <button type='button' onClick={() => setOpen(o => !o)} className={`rs-btn${open || value !== 'all' ? ' is-on' : ''}`} aria-expanded={open}>
        <Filter className='size-4' strokeWidth={2} />
        <span>{value === 'all' ? t('filter.all') : value}</span>
        <ChevronDown className={`rs-btn__chev size-3.5${open ? ' rotate-180' : ''}`} strokeWidth={2.2} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }} className='absolute end-0 z-20 mt-2 min-w-40 overflow-hidden rounded-[14px] border border-(--gm-line) bg-(--gm-paper) py-1 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.45)]'>
            {options.map(opt => (
              <button
                key={opt}
                type='button'
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-1.5 px-3 py-2 text-start text-[12.5px] font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary-500)_8%,transparent)]
                  ${opt === value ? 'text-[var(--color-primary-700)] dark:text-[var(--color-primary-200)]' : 'gm-ink-soft'}`}>
                {opt === value && <div className='size-1.5 shrink-0 rounded-full bg-[var(--color-primary-500)]' />}
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

  const total = items.length;

  return (
    <div data-plain-page="1" className='report-phone -mx-[var(--app-gutter)] min-h-full bg-white px-[var(--app-gutter)] pt-1 dark:bg-[#0b1220]' dir={isRTL ? 'rtl' : 'ltr'}>
      <div className='mx-auto w-full max-w-[440px] space-y-3'>
      <div className='m-[5px] rounded-3xl shadow-[5px_7px_14px_color-mix(in_srgb,var(--color-primary-900)_45%,transparent)]'>
        <div className='relative overflow-hidden rounded-3xl border-[1.5px] border-t-white/40 border-s-white/30 border-e-[rgba(15,34,128,0.35)] border-b-[rgba(15,34,128,0.45)] pb-3' style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-primary-700), #1a3fbf)' }}>
          <div className='pointer-events-none absolute -start-16 -top-10 h-[200px] w-[200px] rounded-full bg-white/[0.06]' />
          <div className='relative flex items-center gap-3 p-4 pb-2'>
            <div className='grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-t-white/45 border-b-[rgba(15,48,120,0.35)] bg-white/15 text-white'>
              <Bell className='h-5 w-5' />
            </div>
            <div className='min-w-0 flex-1'>
              <h1 className='truncate text-xl font-black leading-6 tracking-[-0.3px] text-white'>{tAll('header.title')}</h1>
              <p className='mt-0.5 truncate text-[10px] font-medium text-white/55'>{tAll('header.subtitle', { total, unread })}</p>
            </div>
            <button type='button' onClick={refresh} aria-label={tAll('actions.refresh')} className='grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-t-white/45 border-b-[rgba(15,48,120,0.35)] bg-white/15 text-white'>
              <RefreshCw className={`h-[18px] w-[18px]${spinning ? ' animate-spin' : ''}`} />
            </button>
            <button type='button' onClick={markAll} disabled={!unread} aria-label={tAll('actions.markAllRead')} className='grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/90 bg-white text-(--color-primary-700) disabled:opacity-40'>
              <CheckCheck className='h-[18px] w-[18px]' />
            </button>
          </div>
          <div className='mx-4 mb-2 h-px bg-white/20' />
          <div className='flex gap-1.5 px-4'>
            {[
              ['all', tAll('tabs.all'), total],
              ['unread', tAll('tabs.unread'), unread],
            ].map(([k, l, count]) => {
              const on = tab === k;
              return (
                <button key={k} type='button' onClick={() => setTab(k)} className={`flex h-9 min-w-0 flex-1 items-center justify-center gap-1 truncate rounded-2xl px-2 text-[11px] font-bold ${on ? 'border border-white/90 bg-white text-(--color-primary-700) shadow-[2px_4px_7px_rgba(30,58,138,0.35)]' : 'border border-white/30 bg-white/10 text-white/70'}`}>
                  <span className='truncate'>{l}</span>
                  <span className={`rounded-full px-1.5 text-[10px] ${on ? 'bg-(--color-primary-50) text-(--color-primary-700)' : 'bg-white/15 text-white'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <TypeMenu value={type} options={types} onChange={setType} t={tAll} />

      {/* ── BULK BAR ── */}
      <AnimatePresence>
        {sel.size > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className='overflow-hidden'>
            <div className='flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-(--gm-line) bg-[color-mix(in_srgb,var(--color-primary-500)_8%,var(--gm-paper))] px-3 py-2'>
              <p className='text-[12.5px] font-semibold gm-ink'>
                {tAll('bulk.selected', { count: sel.size })}
              </p>
              <div className='flex flex-wrap items-center gap-1.5'>
                <button type='button' onClick={markSelRead} className='rs-btn is-on'>
                  <Check className='size-3.5' strokeWidth={2.4} /> {tAll('bulk.markRead')}
                </button>
                <button type='button' onClick={selAll} className='rs-btn'>
                  {tAll('bulk.selectAll')}
                </button>
                <button type='button' onClick={clearSel} className='rs-btn' aria-label={tAll('bulk.selectAll')}>
                  <X className='size-3.5' />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LIST ── */}
      <div className='space-y-2'>
        {loading ? (
          <Skel />
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='py-14 text-center'>
            <div className='mx-auto mb-2.5 grid size-10 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary-500)_12%,transparent)]'>
              <Inbox className='size-4 text-[var(--color-primary-600)]' />
            </div>
            <p className='mb-1 text-[13px] font-semibold gm-ink'>{tAll('empty.title')}</p>
            <p className='text-[12px] gm-muted'>{tAll('empty.desc')}</p>
          </motion.div>
        ) : (
          <AnimatePresence mode='popLayout'>
            {grouped.map(({ d, l }, gi) => (
              <motion.div key={d} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: gi * 0.02 }}>
                {/* day divider */}
                <div className='sticky top-0 z-10 flex items-center gap-2 border-b border-(--gm-line) bg-(--gm-paper) px-4 py-2'>
                  <div className='h-px flex-1 bg-(--gm-line)' />
                  <span className='rounded-full border border-(--gm-line) bg-[color-mix(in_srgb,var(--color-primary-500)_8%,var(--gm-paper))] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-primary-700)] dark:text-[var(--color-primary-200)]'>
                    <DayLabel iso={d} t={tAll} />
                  </span>
                  <div className='h-px flex-1 bg-(--gm-line)' />
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
          <div className='flex flex-wrap items-center justify-between gap-2 border-t border-(--gm-line) px-4 py-3 sm:px-5'>
            <button type='button' onClick={selAll} className='rs-btn'>
              {tAll('footer.selectAll', { count: filtered.length })}
            </button>
            {hasMore && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={more}
                disabled={loadMore}
                className='rs-cta'
                style={{ width: 'auto' }}>
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
    </div>
  );
}
