'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { LangSwitch } from '@/components/pages/home/Navbar';

/* ═══════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════ */
export default function PublicPlanPage() {
  const { id } = useParams();
  const search = useSearchParams();

  const intlLocale = useLocale();
  const queryLang = search?.get('lang');
  const cookieLang =
    typeof document !== 'undefined'
      ? document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]+)/)?.[1] || null
      : null;
  const lang = (queryLang || cookieLang || intlLocale || 'ar').toLowerCase();
  const dir  = lang === 'ar' ? 'rtl' : 'ltr';
  const t    = useTranslations('PublicPlan');

  const [data,   setData]   = useState(null);
  const [status, setStatus] = useState('idle');
  const [error,  setError]  = useState(null);

  const base = useMemo(() => process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081', []);
  const createdAt = data?.created_at
    ? new Date(data.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')
    : '';
  const days = data?.program?.days || [];

  /* ── fetch ── */
  const load = useCallback(() => {
    if (!id) return;
    setStatus('loading'); setError(null);
    const ctrl = new AbortController();
    axios.get(`${base}/api/v1/plans/${id}?lang=${lang}`, {
      signal: ctrl.signal,
      headers: { 'Cache-Control': 'no-store' },
    })
      .then(res => { setData(res.data); setStatus('success'); })
      .catch(err => {
        if (axios.isCancel(err)) return;
        setError(`${t('loadFailed')}: ${err?.response?.status || ''} ${err?.response?.statusText || err?.message || ''}`);
        setStatus('error');
      });
    return () => ctrl.abort();
  }, [id, lang, base, t]);

  useEffect(() => { const a = load(); return () => typeof a === 'function' && a(); }, [load]);

  /* ── scrollspy ── */
  const sectionsRef = useRef({});
  const [activeKey, setActiveKey] = useState(null);
  useEffect(() => {
    if (!days.length) return;
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && setActiveKey(e.target.id)),
      { rootMargin: '-40% 0px -55% 0px', threshold: 0.01 }
    );
    Object.values(sectionsRef.current).forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, [days.length]);

  /* ── accordion ── */
  const [expanded, setExpanded] = useState(() => new Set([0]));
  const isExpanded = i => expanded.has(i);
  const toggleDay  = i => setExpanded(prev => { const n = new Set(); if (!prev.has(i)) n.add(i); return n; });
  const expandAll  = () => setExpanded(new Set(days.map((_, i) => i)));
  const collapseAll= () => setExpanded(new Set());

  /* ── ✅ scroll-bug fix ── */
  const rafRef = useRef(null);
  const openAndScrollTo = i => {
    const key = makeDayId(i, days[i]);
    setActiveKey(key);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setExpanded(new Set([i]));
    rafRef.current = requestAnimationFrame(() =>
      rafRef.current = requestAnimationFrame(() =>
        setTimeout(() => {
          sectionsRef.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50)
      )
    );
  };

  const [mobileDrawer, setMobileDrawer] = useState(false);
  const totalEx = days.reduce((s, d) => s + (d.exercises || []).length, 0);

  return (
    <main dir={dir} className="pp-root min-h-screen">
      <PPStyles />

      {/* ══ HEADER ══ */}
      <header className="pp-header sticky top-0 z-30">
        <div className="pp-container">
          <div className="pp-header-inner">

            {/* left: wordmark + title */}
            <motion.div
              className="pp-brand"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="pp-logo" aria-hidden>
                <svg viewBox="0 0 20 20" fill="none">
                  <path d="M4 10h12M7 6l-4 4 4 4M13 6l4 4-4 4"
                    stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="pp-title-wrap">
                <span className="pp-plan-label">{t('publicShare')}</span>
                <h1 className="pp-plan-name">
                  {status === 'success' ? data?.name || t('plan') : t('plan')}
                </h1>
              </div>
            </motion.div>

            {/* right: actions */}
            <div className="pp-header-actions">
              <LangSwitch />
              <div className="pp-action-divider" />
              <ActionsClient t={t} />
              {status === 'success' && days.length > 0 && (
                <button
                  className="pp-icon-btn md:hidden"
                  onClick={() => setMobileDrawer(true)}
                  aria-label="Open index"
                >
                  <svg viewBox="0 0 18 18" fill="none">
                    <path d="M2 4.5h14M2 9h9M2 13.5h6"
                      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ══ HERO BAND ══ */}
      {status === 'success' && days.length > 0 && (
        <motion.div
          className="pp-hero-band"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="pp-container">
            <div className="pp-hero-inner">
              {/* stats */}
              <div className="pp-stats-row">
                <StatBadge value={days.length}  label={t('days') || 'Days'}      accent />
                <StatBadge value={totalEx}       label={t('exercises') || 'Exercises'} />
                {createdAt && (
                  <span className="pp-created">{t('createdAt')}: {createdAt}</span>
                )}
              </div>
              {/* expand/collapse */}
              <div className="pp-hero-controls">
                <PillBtn onClick={expandAll}   icon={<ExpandIcon />}   label={t('expandAll')} />
                <PillBtn onClick={collapseAll} icon={<CollapseIcon />} label={t('collapseAll')} />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ══ BODY ══ */}
      <div className="pp-container pp-body">

        {status === 'loading' && <LoadingSkeleton />}

        {status === 'error' && (
          <motion.div className="pp-error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <span className="pp-error-icon">⚠️</span>
            <p>{error || t('cantLoad')}</p>
            <button className="pp-retry-btn" onClick={load}>{t('retry')}</button>
          </motion.div>
        )}

        {status === 'success' && days.length === 0 && (
          <EmptyState title={t('noDaysTitle')} subtitle={t('noDaysSubtitle')} />
        )}

        {status === 'success' && days.length > 0 && (
          <div className="pp-layout">

            {/* ── SIDEBAR ── */}
            <aside className="pp-sidebar hidden md:block">
              <nav className="pp-nav-panel">
                <div className="pp-nav-header">
                  <span className="pp-nav-eyebrow">{t('index')}</span>
                  <span className="pp-nav-count">{days.length}</span>
                </div>
                <ul className="pp-nav-list pp-scroll">
                  {days.map((d, i) => {
                    const key   = makeDayId(i, d);
                    const active = activeKey === key;
                    return (
                      <li key={key}>
                        <button
                          className={`pp-nav-item ${active ? 'pp-nav-item--active' : ''}`}
                          onClick={() => openAndScrollTo(i)}
                        >
                          <span className={`pp-nav-num ${active ? 'pp-nav-num--active' : ''}`}>
                            {i + 1}
                          </span>
                          <span className="pp-nav-text">
                            <span className="pp-nav-day">{toArabicDay(d.dayOfWeek, lang)}</span>
                            <span className="pp-nav-name">{d.name}</span>
                          </span>
                          <span className={`pp-nav-badge ${active ? 'pp-nav-badge--active' : ''}`}>
                            {(d.exercises || []).length}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>

            {/* ── DAYS ── */}
            <div className="pp-days">
              {days.map((d, i) => {
                const key  = makeDayId(i, d);
                const open = isExpanded(i);
                const exCount = (d.exercises || []).length;
                return (
                  <motion.section
                    key={key}
                    id={key}
                    ref={el => (sectionsRef.current[key] = el)}
                    className={`pp-day-card scroll-mt-28 ${open ? 'pp-day-card--open' : ''}`}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-4% 0px -4% 0px' }}
                    transition={{ duration: 0.32, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {/* day toggle */}
                    <button
                      className="pp-day-toggle"
                      onClick={() => toggleDay(i)}
                      aria-expanded={open}
                    >
                      {/* number pill */}
                      <span className={`pp-day-num-pill ${open ? 'pp-day-num-pill--open' : ''}`}>
                        {i + 1}
                      </span>

                      {/* text */}
                      <span className="pp-day-info">
                        <span className="pp-day-week">{toArabicDay(d.dayOfWeek, lang)}</span>
                        <span className="pp-day-name-sep" aria-hidden>·</span>
                        <span className="pp-day-name">{d.name}</span>
                      </span>

                      {/* meta */}
                      <span className="pp-day-meta">
                        <span className="pp-day-ex-count">
                          <span className="pp-day-ex-count-num">{exCount}</span>
                          <span className="pp-day-ex-count-label">{t('exercises')}</span>
                        </span>
                        {d.duration && (
                          <span className="pp-day-duration">⏱ {d.duration}</span>
                        )}
                      </span>

                      <ChevronIcon open={open} />
                    </button>

                    {/* exercises */}
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          key="body"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div className="pp-exercises-wrap">
                            <motion.ul
                              variants={staggerList}
                              initial="hidden"
                              animate="show"
                              className="pp-exercises-grid"
                            >
                              {(d.exercises || []).map((ex, ei) => (
                                <ExerciseCard key={ex.id || ei} ex={ex} index={ei} t={t} dir={dir} />
                              ))}
                            </motion.ul>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.section>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <footer className="pp-footer">
        <div className="pp-container">{t('footerNote')}</div>
      </footer>

      {/* ══ MOBILE DRAWER ══ */}
      <AnimatePresence>
        {mobileDrawer && (
          <>
            <motion.div
              key="bd"
              className="pp-drawer-backdrop md:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileDrawer(false)}
            />
            <motion.div
              key="drawer"
              className="pp-drawer md:hidden"
              dir={dir}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            >
              <div className="pp-drawer-handle-bar" />
              <div className="pp-drawer-head">
                <span className="pp-nav-eyebrow">{t('index')}</span>
                <button className="pp-icon-btn" onClick={() => setMobileDrawer(false)}>✕</button>
              </div>
              <ul className="pp-drawer-list pp-scroll">
                {days.map((d, i) => {
                  const key   = makeDayId(i, d);
                  const active = activeKey === key;
                  return (
                    <li key={key}>
                      <button
                        className={`pp-drawer-item ${active ? 'pp-drawer-item--active' : ''}`}
                        onClick={() => { openAndScrollTo(i); setMobileDrawer(false); }}
                      >
                        <span className={`pp-nav-num ${active ? 'pp-nav-num--active' : ''}`}>{i + 1}</span>
                        <span className="pp-nav-text">
                          <span className="pp-nav-day">{toArabicDay(d.dayOfWeek, lang)}</span>
                          <span className="pp-nav-name">{d.name}</span>
                        </span>
                        <span className={`pp-nav-badge ${active ? 'pp-nav-badge--active' : ''}`}>
                          {(d.exercises || []).length}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ScrollToTop />
      <ToastHost />
    </main>
  );
}

/* ═══════════════════════════════════════════════
   EXERCISE CARD
═══════════════════════════════════════════════ */
function ExerciseCard({ ex, t, index = 0, dir = 'ltr' }) {
  const [videoOpen, setVideoOpen] = useState(false);
  const hasVideo  = Boolean(ex.video);
  const playClass = dir === 'rtl' ? 'pp-play-btn--rtl' : 'pp-play-btn--ltr';

  return (
    <motion.li variants={cardFade} className="pp-ex-card group">

      {/* ── thumbnail ── */}
      <div className="pp-ex-thumb">
        {ex.img
          ? <img src={ex.img} alt={ex.name}
              className="pp-ex-img"
              loading={index > 3 ? 'lazy' : 'eager'} />
          : <span className="pp-ex-placeholder" aria-hidden>💪</span>
        }

        {/* top-right: order badge */}
        {(ex.order || ex.idx) && (
          <span className="pp-ex-order">#{ex.order ?? ex.idx}</span>
        )}

        {/* top-start: play btn */}
        {hasVideo && (
          <button
            type="button"
            className={`pp-play-btn ${playClass}`}
            onClick={() => setVideoOpen(true)}
            aria-label={t('watchVideo')}
          >
            <PlayIcon />
          </button>
        )}

        {/* bottom overlay: name */}
        <div className="pp-ex-name-overlay">
          <span className="pp-ex-name">{ex.name}</span>
        </div>
      </div>

      {/* ── stats ── */}
      <div className="pp-ex-body">
        <div className="pp-ex-stats">
          <ExStat label={t('sets')}  value={ex.targetSets ?? '—'} />
          <ExStat label={t('reps')}  value={ex.targetReps ?? '—'} />
          <ExStat label={t('rest')}  value={ex.rest != null ? `${ex.rest}s` : '—'} />
          <ExStat label={t('tempo')} value={ex.tempo ?? '—'} />
        </div>

        {ex.details && (
          <p className="pp-ex-details">{ex.details}</p>
        )}

        {(ex.primary_muscles_worked?.length || ex.secondary_muscles_worked?.length) && (
          <div className="pp-ex-muscles">
            {(ex.primary_muscles_worked || []).map((m, i) => (
              <span key={`p${i}`} className="pp-muscle pp-muscle--primary">{m}</span>
            ))}
            {(ex.secondary_muscles_worked || []).map((m, i) => (
              <span key={`s${i}`} className="pp-muscle pp-muscle--secondary">{m}</span>
            ))}
          </div>
        )}
      </div>

      {videoOpen && (
        <VideoModal title={ex.name} src={ex.video} onClose={() => setVideoOpen(false)} />
      )}
    </motion.li>
  );
}

function ExStat({ label, value }) {
  return (
    <div className="pp-ex-stat">
      <span className="pp-ex-stat-label">{label}</span>
      <span className="pp-ex-stat-value">{value}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   VIDEO MODAL
═══════════════════════════════════════════════ */
function VideoModal({ title, src, onClose }) {
  const videoRef = useRef(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus?.();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      try { videoRef.current?.pause(); videoRef.current?.removeAttribute('src'); videoRef.current?.load(); } catch {}
    };
  }, []);

  const close = () => { try { videoRef.current?.pause(); } catch {} onClose(); };

  return (
    <div className="pp-modal-backdrop" onClick={close} role="dialog" aria-modal aria-label={title}>
      <motion.div
        className="pp-modal"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="pp-modal-head">
          <span className="pp-modal-title">{title}</span>
          <button ref={closeBtnRef} className="pp-icon-btn" onClick={close}>✕</button>
        </div>
        <video ref={videoRef} src={src} controls playsInline preload="metadata" className="pp-modal-video" />
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   HEADER ACTIONS
═══════════════════════════════════════════════ */
function ActionsClient({ t }) {
  const share = () => {
    if (navigator?.share) navigator.share({ url: location.href, title: document.title }).catch(() => {});
    else copyLink(t);
  };
  return (
    <>
      {/* <button className="pp-action-btn pp-action-btn--primary" onClick={share} title={t('share')}>
        <ShareIcon /> <span className="hidden sm:inline">{t('share')}</span>
      </button> */}
      {/* <button className="pp-action-btn" onClick={() => copyLink(t)} title={t('copy')}>
        <CopyIcon />
      </button> */}
      <button className="pp-action-btn" onClick={() => window.print()} title={t('print')}>
        <PrintIcon />
      </button>
    </>
  );
}

/* ═══════════════════════════════════════════════
   SMALL COMPONENTS
═══════════════════════════════════════════════ */
function StatBadge({ value, label, accent }) {
  return (
    <div className={`pp-stat-badge ${accent ? 'pp-stat-badge--accent' : ''}`}>
      <span className="pp-stat-val">{value}</span>
      <span className="pp-stat-label">{label}</span>
    </div>
  );
}

function PillBtn({ onClick, icon, label }) {
  return (
    <button className="pp-pill-btn" onClick={onClick}>
      <span className="pp-pill-icon">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="pp-skeleton-wrap space-y-3 py-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="pp-skeleton-row" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="pp-sk-num" />
          <div className="pp-sk-lines">
            <div className="pp-sk-line pp-sk-line--wide" />
            <div className="pp-sk-line pp-sk-line--narrow" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="pp-empty">
      <div className="pp-empty-icon">📭</div>
      <h3 className="pp-empty-title">{title}</h3>
      <p className="pp-empty-sub">{subtitle}</p>
    </div>
  );
}

function ScrollToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const fn = () => setShow(window.scrollY > 600);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);
  if (!show) return null;
  return (
    <motion.button
      className="pp-scroll-top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Scroll to top"
    >
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M10 15V5M5 10l5-5 5 5" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </motion.button>
  );
}
function ToastHost() { return <div id="toast-root" className="pointer-events-none fixed inset-0 z-[70]" />; }

/* ═══════════════════════════════════════════════
   ICONS
═══════════════════════════════════════════════ */
function ShareIcon()   { return <svg viewBox="0 0 20 20" fill="none" className="pp-icon"><path d="M13 7.5l-5 2.5 5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="15" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="5" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="15" cy="14" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg>; }
function CopyIcon()    { return <svg viewBox="0 0 20 20" fill="none" className="pp-icon"><rect x="7" y="7" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="4" y="4" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" opacity=".5"/></svg>; }
function PrintIcon()   { return <svg viewBox="0 0 20 20" fill="none" className="pp-icon"><path d="M6 7V3h8v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="7" width="14" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M6 14h8v3H6z" stroke="currentColor" strokeWidth="1.5"/></svg>; }
function PlayIcon()    { return <svg viewBox="0 0 20 20" fill="currentColor" className="pp-icon"><path d="M7 4.5v11l9-5.5z"/></svg>; }
function ExpandIcon()  { return <svg viewBox="0 0 20 20" fill="none" className="pp-icon"><path d="M7 9h6M4 6h12M4 12h12M7 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function CollapseIcon(){ return <svg viewBox="0 0 20 20" fill="none" className="pp-icon"><path d="M7 10h6M4 5h12M4 15h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function ChevronIcon({ open }) {
  return (
    <svg viewBox="0 0 20 20" fill="none"
      className="pp-chevron"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
               color: open ? 'var(--color-primary-500)' : 'var(--muted-foreground)' }}>
      <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════ */
function makeDayId(idx, d) {
  const s = (d?.name || 'day').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `day-${idx + 1}-${s || 'x'}`;
}
function toArabicDay(d, lang = 'ar') {
  const ar = { saturday:'السبت', sunday:'الأحد', monday:'الاثنين', tuesday:'الثلاثاء', wednesday:'الأربعاء', thursday:'الخميس', friday:'الجمعة' };
  const en = { saturday:'Saturday', sunday:'Sunday', monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday', thursday:'Thursday', friday:'Friday' };
  const k = d?.toLowerCase?.();
  return lang === 'ar' ? ar[k] || d : en[k] || d;
}
function toast(msg) {
  const root = document.getElementById('toast-root') || document.body;
  const el = document.createElement('div');
  el.textContent = msg;
  el.className = 'pp-toast';
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('pp-toast--in'));
  setTimeout(() => { el.classList.remove('pp-toast--in'); setTimeout(() => el.remove(), 300); }, 1800);
}
function copyLink(t) {
  const url = window?.location?.href || '';
  if (!url) return;
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(() => toast(t('copied'))).catch(() => toast(t('copyFail')));
  } else {
    const ta = document.createElement('textarea');
    ta.value = url; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(t('copied')); } catch { toast(t('copyFail')); }
    ta.remove();
  }
}

/* ═══════════════════════════════════════════════
   MOTION VARIANTS
═══════════════════════════════════════════════ */
const staggerList = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};
const cardFade = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16,1,0.3,1] } },
};

/* ═══════════════════════════════════════════════
   ALL STYLES  (single source of truth)
═══════════════════════════════════════════════ */
function PPStyles() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

/* ── base ── */
.pp-root {
  font-family: 'DM Sans', system-ui, sans-serif;
  background: var(--background);
  color: var(--foreground);
}
.pp-container { max-width: 1152px; margin: 0 auto; padding: 0 1.25rem; }

/* ── header ── */
.pp-header {
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 1px 0 var(--border), 0 4px 16px rgba(0,0,0,0.04);
}
.pp-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  height: 64px;
}
.pp-brand  { display: flex; align-items: center; gap: .75rem; min-width: 0; }
.pp-logo {
  width: 36px; height: 36px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to));
  color: white;
  box-shadow: 0 2px 10px color-mix(in oklch, var(--color-primary-500) 35%, transparent);
}
.pp-logo svg { width: 18px; height: 18px; }
.pp-title-wrap { min-width: 0; }
.pp-plan-label {
  display: block;
  font-size: 9px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  color: var(--color-primary-400);
  line-height: 1;
}
.pp-plan-name {
  font-family: 'Syne', system-ui, sans-serif;
  font-size: 16px; font-weight: 800;
  color: var(--foreground);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  line-height: 1.3;
  margin-top: 2px;
}
.pp-header-actions { display: flex; align-items: center; gap: .5rem; flex-shrink: 0; }
.pp-action-divider {
  width: 1px; height: 24px;
  background: var(--border);
  margin: 0 .25rem;
}

/* action buttons */
.pp-action-btn {
  display: inline-flex; align-items: center; gap: .4rem;
  padding: 6px 12px;
  font-size: 12px; font-weight: 600; font-family: inherit;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--foreground);
  cursor: pointer;
  transition: background .15s, border-color .15s, box-shadow .15s;
  white-space: nowrap;
}
.pp-action-btn:hover {
  background: var(--muted);
  border-color: var(--color-primary-200);
}
.pp-action-btn--primary {
  background: var(--color-primary-50);
  border-color: var(--color-primary-200);
  color: var(--color-primary-700);
}
.pp-action-btn--primary:hover {
  background: var(--color-primary-100);
  box-shadow: 0 2px 10px color-mix(in oklch, var(--color-primary-400) 20%, transparent);
}
.pp-icon-btn {
  width: 34px; height: 34px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: background .15s, color .15s;
  font-size: 13px; font-family: inherit;
}
.pp-icon-btn svg { width: 16px; height: 16px; }
.pp-icon-btn:hover { background: var(--muted); color: var(--foreground); }
.pp-icon { width: 15px; height: 15px; flex-shrink: 0; }

/* ── hero band ── */
.pp-hero-band {
  background: linear-gradient(105deg, var(--color-primary-50) 0%, var(--color-secondary-50) 60%, white 100%);
  border-bottom: 1px solid color-mix(in oklch, var(--color-primary-200) 60%, transparent);
  padding: .875rem 0;
  position: relative;
  overflow: hidden;
}
.pp-hero-band::before {
  content: '';
  position: absolute; inset: 0;
  background: repeating-linear-gradient(
    -55deg,
    transparent 0px, transparent 18px,
    color-mix(in oklch, var(--color-primary-200) 25%, transparent) 18px,
    color-mix(in oklch, var(--color-primary-200) 25%, transparent) 19px
  );
  pointer-events: none;
}
.pp-hero-inner {
  display: flex; flex-wrap: wrap; align-items: center;
  gap: .75rem; position: relative;
}
.pp-stats-row { display: flex; align-items: center; gap: .625rem; flex-wrap: wrap; }
.pp-stat-badge {
  display: flex; align-items: baseline; gap: .35rem;
  padding: .45rem .875rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: white;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}
.pp-stat-badge--accent {
  background: var(--color-primary-600);
  border-color: var(--color-primary-600);
}
.pp-stat-val {
  font-family: 'Syne', system-ui, sans-serif;
  font-size: 20px; font-weight: 800; line-height: 1;
  color: var(--color-primary-700);
}
.pp-stat-badge--accent .pp-stat-val { color: white; }
.pp-stat-label {
  font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .08em;
  color: var(--muted-foreground);
}
.pp-stat-badge--accent .pp-stat-label { color: rgba(255,255,255,.75); }
.pp-created {
  font-size: 11px; color: var(--muted-foreground);
  padding: 0 .5rem;
}
.pp-hero-controls { display: flex; gap: .5rem; margin-inline-start: auto; }
.pp-pill-btn {
  display: inline-flex; align-items: center; gap: .375rem;
  padding: 6px 14px;
  font-size: 11px; font-weight: 600; font-family: inherit;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: white;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all .15s;
}
.pp-pill-btn:hover {
  background: var(--muted);
  color: var(--foreground);
  border-color: var(--color-primary-200);
}
.pp-pill-icon { display: flex; align-items: center; }
.pp-pill-icon svg { width: 13px; height: 13px; }

/* ── layout ── */
.pp-body { padding-top: 1.5rem; padding-bottom: 2rem; }
.pp-layout { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
@media (min-width: 768px) {
  .pp-layout { grid-template-columns: 248px 1fr; }
}

/* ── sidebar nav ── */
.pp-sidebar {}
.pp-nav-panel {
  position: sticky; top: 80px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--card);
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,.05);
}
.pp-nav-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: .75rem 1rem;
  background: var(--sidebar);
  border-bottom: 1px solid var(--border);
}
.pp-nav-eyebrow {
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  color: var(--muted-foreground);
}
.pp-nav-count {
  font-family: 'Syne', system-ui, sans-serif;
  font-size: 11px; font-weight: 800;
  color: var(--color-primary-500);
  background: var(--color-primary-50);
  border: 1px solid var(--color-primary-100);
  border-radius: 999px;
  padding: 1px 7px;
}
.pp-nav-list { padding: .375rem; max-height: calc(100vh - 170px); overflow-y: auto; }
.pp-nav-item {
  width: 100%;
  display: flex; align-items: center; gap: .625rem;
  padding: .5rem .625rem;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: all .14s;
  text-align: start;
}
.pp-nav-item:hover { background: var(--muted); }
.pp-nav-item--active {
  background: var(--color-primary-50) !important;
  border-color: var(--color-primary-200);
}
.pp-nav-num {
  width: 24px; height: 24px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 7px;
  font-size: 10px; font-weight: 800; font-family: 'Syne', system-ui, sans-serif;
  background: var(--color-primary-100);
  color: var(--color-primary-600);
  transition: all .14s;
}
.pp-nav-num--active {
  background: var(--color-primary-500);
  color: white;
  box-shadow: 0 2px 8px color-mix(in oklch, var(--color-primary-500) 35%, transparent);
}
.pp-nav-text { flex: 1; min-width: 0; }
.pp-nav-day  { display: block; font-size: 11.5px; font-weight: 700; color: var(--foreground); line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pp-nav-name { display: block; font-size: 10px; color: var(--muted-foreground); line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
.pp-nav-item--active .pp-nav-day { color: var(--color-primary-700); }
.pp-nav-badge {
  flex-shrink: 0;
  font-size: 10px; font-weight: 600; font-family: 'Syne', system-ui, sans-serif;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--muted);
  color: var(--muted-foreground);
  transition: all .14s;
}
.pp-nav-badge--active {
  background: var(--color-primary-100);
  color: var(--color-primary-600);
}

/* ── days ── */
.pp-days { display: flex; flex-direction: column; gap: .75rem; }
.pp-day-card {
  border-radius: 14px;
  border: 1.5px solid var(--border);
  background: var(--card);
  overflow: hidden;
  transition: border-color .2s, box-shadow .2s;
}
.pp-day-card--open {
  border-color: var(--color-primary-200);
  box-shadow: 0 4px 24px color-mix(in oklch, var(--color-primary-400) 10%, transparent),
              0 1px 4px rgba(0,0,0,.05);
}
.pp-day-toggle {
  width: 100%;
  display: flex; align-items: center; gap: .875rem;
  padding: .9rem 1.125rem;
  cursor: pointer;
  background: transparent;
  font-family: inherit;
  text-align: start;
  transition: background .16s;
}
.pp-day-card--open .pp-day-toggle { background: var(--color-primary-50); }
.pp-day-toggle:not([aria-expanded="true"]):hover { background: var(--muted); }

.pp-day-num-pill {
  flex-shrink: 0;
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 12px;
  font-family: 'Syne', system-ui, sans-serif;
  font-size: 15px; font-weight: 800;
  background: var(--color-primary-100);
  color: var(--color-primary-600);
  transition: all .2s ease;
}
.pp-day-num-pill--open {
  background: linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to));
  color: white;
  box-shadow: 0 4px 14px color-mix(in oklch, var(--color-primary-500) 32%, transparent);
  transform: scale(1.05);
}
.pp-day-info {
  flex: 1; min-width: 0;
  display: flex; align-items: baseline; gap: .4rem; flex-wrap: wrap;
}
.pp-day-week {
  font-family: 'Syne', system-ui, sans-serif;
  font-size: 15px; font-weight: 800;
  color: var(--foreground); white-space: nowrap;
}
.pp-day-name-sep { color: var(--border); font-size: 14px; }
.pp-day-name { font-size: 14px; font-weight: 500; color: var(--muted-foreground); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
.pp-day-meta { display: flex; align-items: center; gap: .5rem; flex-shrink: 0; }
.pp-day-ex-count {
  display: flex; flex-direction: column; align-items: flex-end;
}
.pp-day-ex-count-num {
  font-family: 'Syne', system-ui, sans-serif;
  font-size: 17px; font-weight: 800; line-height: 1;
  color: var(--color-primary-600);
}
.pp-day-ex-count-label {
  font-size: 9px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .07em;
  color: var(--muted-foreground);
  line-height: 1.3;
}
.pp-day-duration {
  font-size: 11px; color: var(--muted-foreground);
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--muted);
  border: 1px solid var(--border);
  white-space: nowrap;
}
.pp-chevron {
  width: 20px; height: 20px; flex-shrink: 0;
  transition: transform .22s ease, color .2s;
}

/* exercises */
.pp-exercises-wrap {
  border-top: 1.5px solid var(--color-primary-100);
  padding: 1rem 1.125rem;
}
.pp-exercises-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: .75rem;
  list-style: none; margin: 0; padding: 0;
}

/* exercise card */
.pp-ex-card {
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: var(--card);
  overflow: hidden;
  transition: border-color .18s, box-shadow .18s, transform .18s;
  cursor: default;
}
.pp-ex-card:hover {
  border-color: var(--color-primary-300);
  box-shadow: 0 6px 24px color-mix(in oklch, var(--color-primary-400) 14%, transparent);
  transform: translateY(-2px);
}
.pp-ex-thumb {
  position: relative;
  height: 148px;
  background: linear-gradient(160deg, var(--color-primary-50) 0%, var(--color-secondary-50) 100%);
  overflow: hidden;
}
.pp-ex-img {
  width: 100%; height: 100%; object-fit: contain;
  padding: .5rem;
  transition: transform .45s ease;
}
.pp-ex-card:hover .pp-ex-img { transform: scale(1.06); }
.pp-ex-placeholder {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 2.5rem; opacity: .2;
}
.pp-ex-order {
  position: absolute; top: 6px; right: 6px;
  font-size: 9px; font-weight: 700;
  padding: 2px 7px; border-radius: 999px;
  background: rgba(255,255,255,.9);
  color: var(--muted-foreground);
  border: 1px solid var(--border);
  backdrop-filter: blur(4px);
}
[dir=rtl] .pp-ex-order { right: auto; left: 6px; }

/* name overlay at bottom of thumb */
.pp-ex-name-overlay {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 1.5rem .625rem .5rem;
  background: linear-gradient(to top, rgba(255,255,255,.95) 0%, transparent 100%);
}
.pp-ex-name {
  display: block;
  font-size: 12px; font-weight: 700;
  color: var(--foreground);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* play button */
.pp-play-btn {
  position: absolute; top: 7px;
  width: 30px; height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: rgba(255,255,255,.92);
  border: 1.5px solid var(--color-primary-200);
  color: var(--color-primary-600);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,.1);
  backdrop-filter: blur(4px);
  transition: all .16s;
}
.pp-play-btn--ltr { left: 7px; }
.pp-play-btn--rtl { right: 7px; }
.pp-play-btn:hover {
  background: var(--color-primary-500);
  border-color: var(--color-primary-500);
  color: white;
  transform: scale(1.08);
}
.pp-play-btn svg { width: 13px; height: 13px; }

/* ex body */
.pp-ex-body { padding: .625rem; }
.pp-ex-stats {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: .375rem;
}
.pp-ex-stat {
  display: flex; flex-direction: column;
  padding: .35rem .5rem;
  border-radius: 8px;
  background: var(--muted);
  border: 1px solid var(--border);
}
.pp-ex-stat-label {
  font-size: 8.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .09em;
  color: var(--muted-foreground); line-height: 1;
}
.pp-ex-stat-value {
  font-family: 'Syne', system-ui, sans-serif;
  font-size: 13px; font-weight: 800;
  color: var(--foreground);
  margin-top: 2px; line-height: 1;
}
.pp-ex-details {
  font-size: 10.5px; line-height: 1.5;
  color: var(--muted-foreground);
  margin-top: .5rem;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.pp-ex-muscles { display: flex; flex-wrap: wrap; gap: .25rem; margin-top: .5rem; }
.pp-muscle {
  font-size: 9px; font-weight: 600;
  padding: 2px 7px; border-radius: 999px;
}
.pp-muscle--primary {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  border: 1px solid var(--color-primary-200);
}
.pp-muscle--secondary {
  background: var(--color-secondary-100);
  color: var(--color-secondary-700);
  border: 1px solid var(--color-secondary-200);
}

/* ── modal ── */
.pp-modal-backdrop {
  position: fixed; inset: 0; z-index: 100;
  display: grid; place-items: center;
  padding: 1rem;
  background: rgba(0,0,0,.5);
  backdrop-filter: blur(10px);
}
.pp-modal {
  width: 100%; max-width: 760px;
  border-radius: 18px;
  overflow: hidden;
  background: var(--card);
  border: 1.5px solid var(--border);
  box-shadow: 0 32px 80px rgba(0,0,0,.2);
}
.pp-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: .875rem 1.25rem;
  border-bottom: 1px solid var(--border);
}
.pp-modal-title {
  font-family: 'Syne', system-ui, sans-serif;
  font-size: 14px; font-weight: 700;
  color: var(--foreground);
}
.pp-modal-video { display: block; width: 100%; max-height: 60vh; background: #000; }

/* ── mobile drawer ── */
.pp-drawer-backdrop {
  position: fixed; inset: 0; z-index: 40;
  background: rgba(0,0,0,.4);
  backdrop-filter: blur(4px);
}
.pp-drawer {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
  border-radius: 20px 20px 0 0;
  max-height: 78vh;
  overflow: hidden;
  display: flex; flex-direction: column;
  background: var(--card);
  border: 1.5px solid var(--border);
  border-bottom: none;
  box-shadow: 0 -12px 48px rgba(0,0,0,.14);
}
.pp-drawer-handle-bar {
  width: 40px; height: 4px; border-radius: 999px;
  background: var(--border);
  margin: .75rem auto .25rem;
  flex-shrink: 0;
}
.pp-drawer-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: .625rem 1.25rem .75rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.pp-drawer-list { overflow-y: auto; padding: .5rem; flex: 1; }
.pp-drawer-item {
  width: 100%;
  display: flex; align-items: center; gap: .75rem;
  padding: .65rem .75rem;
  border-radius: 12px;
  border: 1.5px solid transparent;
  background: transparent;
  cursor: pointer; font-family: inherit;
  text-align: start;
  transition: all .14s;
}
.pp-drawer-item:hover { background: var(--muted); }
.pp-drawer-item--active {
  background: var(--color-primary-50) !important;
  border-color: var(--color-primary-200);
}

/* ── error ── */
.pp-error {
  display: flex; flex-direction: column; align-items: flex-start; gap: .5rem;
  padding: 1.25rem 1.5rem;
  border-radius: 14px;
  border: 1.5px solid var(--destructive);
  background: oklch(0.977 0.013 27);
  color: var(--destructive);
}
.pp-error-icon { font-size: 1.25rem; }
.pp-error p  { font-size: 13px; }
.pp-retry-btn {
  margin-top: .25rem;
  padding: 6px 16px;
  border-radius: 8px;
  border: 1.5px solid var(--destructive);
  background: white; color: var(--destructive);
  font-size: 12px; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: background .14s;
}
.pp-retry-btn:hover { background: oklch(0.97 0.013 27); }

/* ── empty ── */
.pp-empty {
  padding: 4rem 2rem; text-align: center;
  border-radius: 14px;
  border: 1.5px dashed var(--border);
  background: var(--card);
}
.pp-empty-icon { font-size: 2.5rem; margin-bottom: .75rem; }
.pp-empty-title { font-family: 'Syne', system-ui, sans-serif; font-size: 16px; font-weight: 800; color: var(--foreground); }
.pp-empty-sub   { font-size: 13px; color: var(--muted-foreground); margin-top: .25rem; }

/* ── skeleton ── */
.pp-skeleton-row {
  display: flex; align-items: center; gap: .875rem;
  padding: .875rem 1rem;
  border-radius: 14px;
  border: 1.5px solid var(--border);
  background: var(--card);
  animation: pp-pulse 1.4s ease-in-out infinite both;
}
.pp-sk-num    { width: 40px; height: 40px; border-radius: 12px; background: var(--muted); flex-shrink: 0; }
.pp-sk-lines  { display: flex; flex-direction: column; gap: .375rem; }
.pp-sk-line   { height: 10px; border-radius: 6px; background: var(--muted); }
.pp-sk-line--wide   { width: 140px; }
.pp-sk-line--narrow { width: 90px; opacity: .7; }
@keyframes pp-pulse { 0%,100%{opacity:1} 50%{opacity:.55} }

/* ── scroll to top ── */
.pp-scroll-top {
  position: fixed; bottom: 1.5rem; inset-inline-end: 1.25rem;
  z-index: 40;
  width: 42px; height: 42px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 12px;
  border: 1.5px solid var(--color-primary-200);
  background: linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to));
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 20px color-mix(in oklch, var(--color-primary-500) 40%, transparent);
}
.pp-scroll-top svg { width: 18px; height: 18px; }

/* ── footer ── */
.pp-footer {
  padding: 1rem 0 2.5rem;
  text-align: center;
  font-size: 11px;
  color: var(--muted-foreground);
  border-top: 1px solid var(--border);
  margin-top: 1.5rem;
}

/* ── scrollbar ── */
.pp-scroll::-webkit-scrollbar       { width: 4px; }
.pp-scroll::-webkit-scrollbar-track { background: transparent; }
.pp-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
.pp-scroll::-webkit-scrollbar-thumb:hover { background: var(--input); }

/* ── toast ── */
.pp-toast {
  position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%) translateY(12px);
  z-index: 80; pointer-events: auto;
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: 12px; font-weight: 700;
  padding: 8px 20px; border-radius: 999px;
  background: linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to));
  color: white;
  box-shadow: 0 6px 24px color-mix(in oklch, var(--color-primary-500) 35%, transparent);
  opacity: 0; transition: opacity .22s, transform .22s;
}
.pp-toast--in { opacity: 1; transform: translateX(-50%) translateY(0); }

/* ── print ── */
@media print {
  .pp-header, .pp-hero-band, aside, .pp-footer,
  .fixed, .sticky, .pp-scroll-top { display: none !important; }
  .pp-day-card { break-inside: avoid; margin-bottom: 1rem; box-shadow: none !important; }
  .pp-day-toggle { background: var(--muted) !important; }
}

/* ── responsive tweaks ── */
@media (max-width: 640px) {
  .pp-header-inner { height: 56px; }
  .pp-plan-name { font-size: 14px; }
  .pp-day-toggle { padding: .75rem .875rem; gap: .625rem; }
  .pp-day-num-pill { width: 36px; height: 36px; font-size: 14px; }
  .pp-day-week { font-size: 13px; }
  .pp-day-meta { display: none; }
  .pp-exercises-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
  .pp-ex-thumb { height: 128px; }
}
    `}</style>
  );
}



 