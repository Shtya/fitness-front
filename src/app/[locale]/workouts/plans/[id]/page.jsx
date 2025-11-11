/** 
 * i have bug here when click on the day in the index make the first funciton open only not scroll to it untill click again 
*/
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion'; // npm i framer-motion
import LanguageToggle from '@/components/atoms/LanguageToggle';

export default function PublicPlanPage() {
  const { id } = useParams();
  const router = useRouter();
  const search = useSearchParams();

  // Lang resolution: query -> cookie -> next-intl
  const intlLocale = useLocale();
  const queryLang = search?.get('lang');
  const cookieLang =
    typeof document !== 'undefined'
      ? document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]+)/)?.[1] || null
      : null;
  const lang = (queryLang || cookieLang || intlLocale || 'ar').toLowerCase();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const t = useTranslations('PublicPlan');

  const [data, setData] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const base = useMemo(() => process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081', []);

  const createdAt = data?.created_at
    ? new Date(data.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')
    : '';
  const days = data?.program?.days || [];

  const load = useCallback(() => {
    if (!id) return;
    setStatus('loading');
    setError(null);

    const controller = new AbortController();
    axios
      .get(`${base}/api/v1/plans/${id}?lang=${lang}`, {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-store' },
      })
      .then((res) => {
        setData(res.data);
        setStatus('success');
      })
      .catch((err) => {
        if (axios.isCancel(err)) return;
        const st = err?.response?.status;
        const stx = err?.response?.statusText || err?.message || 'Request failed';
        setError(`${t('loadFailed')}: ${st || ''} ${stx}`);
        setStatus('error');
      });

    return () => controller.abort();
  }, [id, lang, base, t]);

  useEffect(() => {
    const abort = load();
    return () => {
      if (typeof abort === 'function') abort();
    };
  }, [load]);

  // Scrollspy
  const sectionsRef = useRef({});
  const [activeKey, setActiveKey] = useState(null);
  useEffect(() => {
    if (!days.length) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActiveKey(e.target.id)),
      { rootMargin: '-40% 0px -55% 0px', threshold: 0.01 }
    );
    Object.values(sectionsRef.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [days.length]);

  // Lang switch: cookie + query param
  const onPickLang = (newLang) => {
    try {
      document.cookie = `NEXT_LOCALE=${newLang}; Path=/; Max-Age=31536000; SameSite=Lax`;
    } catch {}
    const url = new URL(window.location.href);
    url.searchParams.set('lang', newLang);
    window.location.assign(url.toString());
  };

  // Accordion
  const [expanded, setExpanded] = useState(() => new Set([0]));
  const isExpanded = (idx) => expanded.has(idx);

  const toggleDay = (idx) => {
    setExpanded((prev) => {
      const next = new Set();
      if (!prev.has(idx)) next.add(idx); // single-open
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(days.map((_, i) => i)));
  const collapseAll = () => setExpanded(new Set());

  // Index (الفهرس)
  const [showIndex, setShowIndex] = useState(true);

  // Open + smooth scroll + mark active immediately
  // Open + smooth scroll + mark active AFTER layout settles
const openAndScrollTo = (idx) => {
  const key = makeDayId(idx, days[idx]);

  // 1) open only that day and mark it active immediately (for instant UI feedback)
  setExpanded(new Set([idx]));
  setActiveKey(key);

  // 2) defer scrolling until after React commits + CSS layout/animation kicks in
  //    double rAF is a robust way to wait a frame, then another after layout.
  const scroll = () => {
    const el = sectionsRef.current[key];
    if (!el) return;
    // If you're using a sticky header, keep `scroll-mt-*` on the section; this will respect it.
    el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
  };

  // Cancel any previous scheduled scrolls (optional but tidy)
  if (openAndScrollTo._raf1) cancelAnimationFrame(openAndScrollTo._raf1);
  if (openAndScrollTo._raf2) cancelAnimationFrame(openAndScrollTo._raf2);

  openAndScrollTo._raf1 = requestAnimationFrame(() => {
    openAndScrollTo._raf2 = requestAnimationFrame(scroll);
  });
};


  return (
    <main dir={dir} className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-indigo-100/70 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="min-w-0  "
            >
              <h1 className="truncate text-xl font-bold text-slate-900">
                {status === 'success' ? data?.name || t('plan') : t('plan')}
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                {t('publicShare')}
                {createdAt ? ` • ${t('createdAt')}: ${createdAt}` : ''}
              </p>
            </motion.div>

            <div className="flex items-center gap-2">
              <LanguageToggle onPick={onPickLang} currentLang={lang} />
              <ActionsClient t={t} />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        {status === 'loading' && <LoadingSkeleton />}

        {status === 'error' && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
            <p className="text-sm">{error || t('cantLoad')}</p>
            <div className="mt-3">
              <button onClick={load} className="btn-subtle">
                {t('retry')}
              </button>
            </div>
          </div>
        )}

        {status === 'success' && days.length === 0 && (
          <EmptyState title={t('noDaysTitle')} subtitle={t('noDaysSubtitle')} />
        )}

        {status === 'success' && days.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px,1fr]">
            {/* Index – Desktop */}
            <aside className="hidden md:block">
              <nav className="sticky top-[96px] rounded-2xl border border-indigo-100 bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between px-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">{t('index')}</p>
                  <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={expandAll}
                      className="seg-item rounded-lg"
                      aria-label={t('expandAll')}
                      title={t('expandAll')}
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M8 11h8M4 7h16M4 15h16M8 19h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      <span className="hidden sm:inline">{t('expandAll')}</span>
                      <span className="sm:hidden">{t('open')}</span>
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={collapseAll}
                      className="seg-item rounded-lg"
                      aria-label={t('collapseAll')}
                      title={t('collapseAll')}
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M8 12h8M4 6h16M4 18h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      <span className="hidden sm:inline">{t('collapseAll')}</span>
                      <span className="sm:hidden">{t('close')}</span>
                    </motion.button>
                  </div>
                </div>
                <ul className="space-y-1">
                  {days.map((d, idx) => {
                    const idKey = makeDayId(idx, d);
                    const isActive = activeKey === idKey;
                    return (
                      <li key={idKey}>
                        <button
                          onClick={() => openAndScrollTo(idx)}
                          className={[
                            'w-full group flex items-center justify-between rounded-xl px-2 py-1.5 text-sm transition',
                            isActive
                              ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                              : 'text-slate-700 hover:bg-slate-50',
                          ].join(' ')}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-[11px] font-bold text-indigo-700">
                              {idx + 1}
                            </span>
                            <span className="truncate">
                              {toArabicDay(d.dayOfWeek, lang)} — {d.name}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-slate-400">
                            {(d.exercises || []).length}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>
 
            {/* Days */}
            <div className="space-y-4">
              {days.map((d, idx) => {
                const idKey = makeDayId(idx, d);
                const open = isExpanded(idx);
                return (
                  <motion.section
                    key={idKey}
                    id={idKey}
                    ref={(el) => (sectionsRef.current[idKey] = el)}
                    className="scroll-mt-28 rounded-2xl border border-indigo-100 bg-white/70 shadow-sm"
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10% 0% -10% 0%' }}
                    transition={{ duration: 0.35 }}
                  >
                    <button
                      className="flex w-full items-start justify-between gap-3 px-4 py-3 text-start"
                      onClick={() => toggleDay(idx)}
                      aria-expanded={open}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-[13px] font-bold text-indigo-700 ring-1 ring-indigo-200">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <h2 className="truncate text-[15px] font-semibold text-slate-900">
                            {toArabicDay(d.dayOfWeek, lang)} — {d.name}
                          </h2>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {(d.exercises || []).length} {t('exercises')}
                            {d.duration ? ` • ⏱ ${d.duration}` : ''}
                          </p>
                        </div>
                      </div>
                      <Chevron open={open} />
                    </button>

                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          key="content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                        >
                          <div className="border-t border-slate-100 px-4 py-3">
                            <motion.ul
                              variants={stagger}
                              initial="hidden"
                              animate="show"
                              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
                            >
                              {(d.exercises || []).map((ex, i) => (
                                <ExerciseCard key={ex.id || i} index={i} ex={ex} t={t} dir={dir} />
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
      </section>

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-2 text-center text-xs text-slate-400">
        {t('footerNote')}
      </footer>

      <ScrollToTop />
      <ToastHost />
      <StyleHelpers />
    </main>
  );
}

/* -------------------- Exercise Card -------------------- */
function ExerciseCard({ ex, t, index = 0, dir = 'ltr' }) {
  const [open, setOpen] = useState(false);
  const hasVideo = Boolean(ex.video);

  // logical positioning for play button respecting dir (start = left in LTR, right in RTL)
  const startClass = dir === 'rtl' ? 'end-2' : 'start-2';

  return (
    <motion.li variants={fadeUp} className="group relative overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative">
        {/* Media */}
        <div className="relative h-44 w-full overflow-hidden bg-gradient-to-b from-indigo-50 to-slate-50">
          {ex.img ? (
            <>
              <img
                src={ex.img}
                alt={ex.name}
                className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-[1.03]"
                loading={index > 3 ? 'lazy' : 'eager'}
              />
              {hasVideo && (
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  aria-label={t('watchVideo')}
                  title={t('watchVideo')}
                  className={`absolute ${startClass} top-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200 bg-white/90 shadow-sm backdrop-blur hover:bg-white`}
                >
                  <PlayIcon className="h-4 w-4" />
                </button>
              )}
            </>
          ) : (
            <div className="h-full w-full" />
          )}
        </div>

        {/* Corner number */}
        {(ex.order || ex.idx) && (
          <div className="pointer-events-none absolute end-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-indigo-100">
            #{ex.order || ex.idx}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="truncate text-[15px] font-semibold text-slate-900">{ex.name}</h3>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Chip label={`${t('sets')}: ${ex.targetSets ?? '-'}`} />
          <Chip label={`${t('reps')}: ${ex.targetReps ?? '-'}`} />
          <Chip label={`${t('rest')}: ${ex.rest ?? '-'}s`} />
          <Chip label={`${t('tempo')}: ${ex.tempo ?? '-'}`} />
        </div>

        {ex.details && <p className="mt-2 line-clamp-3 text-xs text-slate-600">{ex.details}</p>}

        {(ex.primary_muscles_worked?.length || ex.secondary_muscles_worked?.length) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {(ex.primary_muscles_worked || []).map((m, i) => (
              <Tag key={`p-${i}`} text={m} />
            ))}
            {(ex.secondary_muscles_worked || []).map((m, i) => (
              <Tag key={`s-${i}`} text={m} subtle />
            ))}
          </div>
        )}
      </div>

      {open && <VideoModal onClose={() => setOpen(false)} title={ex.name} src={ex.video} />}
    </motion.li>
  );
}

/* -------------------- Video Modal -------------------- */
function VideoModal({ title, src, onClose }) {
  const videoRef = React.useRef(null);
  const closeBtnRef = React.useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && handleClose();
    window.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    closeBtnRef.current?.focus?.();

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    try {
      videoRef.current?.pause();
    } catch {}
    onClose();
  };

  const stop = (e) => e.stopPropagation();

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        onClick={stop}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          <button ref={closeBtnRef} onClick={handleClose} className="btn-icon" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="bg-white">
          <video ref={videoRef} src={src} controls playsInline preload="metadata" className="h-[60vh] w-full" />
        </div>
      </motion.div>
    </div>
  );
}

/* -------------------- Header Actions -------------------- */
function ActionsClient({ t }) {
  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ url: window.location.href, title: document.title }).catch(() => {});
    } else {
      copyLink(t);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 shadow-sm hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300/30"
        title={t('share')}
      >
        <ShareIcon className="h-4 w-4" />
        {t('share')}
      </button>

      <button
        type="button"
        onClick={() => copyLink(t)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30"
        title={t('copy')}
      >
        <CopyIcon className="h-4 w-4" />
        {t('copy')}
      </button>

      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30"
        title={t('print')}
      >
        <PrintIcon className="h-4 w-4" />
        {t('print')}
      </button>
    </div>
  );
}

/* -------------------- Small UI bits -------------------- */
function Chip({ label }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
      {label}
    </span>
  );
}

function Tag({ text, subtle = false }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
        subtle ? 'border border-slate-200 bg-white text-slate-600' : 'border border-indigo-200 bg-indigo-50 text-indigo-700',
      ].join(' ')}
    >
      {text}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-indigo-100 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 animate-pulse rounded-xl bg-indigo-100" />
              <div>
                <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
                <div className="mt-1 h-2 w-24 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
            <span className="h-3 w-6 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="h-44 w-full animate-pulse rounded-xl bg-slate-100" />
                <div className="mt-3 h-3 w-36 animate-pulse rounded bg-slate-200" />
                <div className="mt-2 flex gap-2">
                  <div className="h-5 w-20 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="rounded-3xl border border-indigo-100 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-indigo-50" />
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function ScrollToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-5 end-5 z-40 rounded-full border border-indigo-200 bg-white/90 p-2 text-indigo-700 shadow-lg backdrop-blur hover:bg-white"
      aria-label="Scroll to top"
      title="Top"
    >
      ↑
    </button>
  );
}

function ToastHost() {
  return <div id="toast-root" className="pointer-events-none fixed inset-0 z-[70]" />;
}

/* -------------------- Utils -------------------- */
function makeDayId(idx, d) {
  const safe = (d?.name || 'day')
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
  return `day-${idx + 1}-${safe || 'x'}`;
}

function toArabicDay(d, lang = 'ar') {
  const mapAr = {
    saturday: 'السبت',
    sunday: 'الأحد',
    monday: 'الاثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس',
    friday: 'الجمعة',
  };
  const mapEn = {
    saturday: 'Saturday',
    sunday: 'Sunday',
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
  };
  const key = d?.toLowerCase?.();
  return lang === 'ar' ? mapAr[key] || d : mapEn[key] || d;
}

function toast(msg) {
  let root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    document.body.appendChild(root);
  }
  const el = document.createElement('div');
  el.textContent = msg;
  el.className =
    'pointer-events-auto fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-lg';
  root.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

function copyLink(t) {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  if (!url) return;
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard
      .writeText(url)
      .then(() => toast(t('copied')))
      .catch(() => toast(t('copyFail')));
  } else {
    const ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast(t('copied'));
    } catch {
      toast(t('copyFail'));
    } finally {
      ta.remove();
    }
  }
}

/* -------------------- Icons + Small Styles -------------------- */
function ShareIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 8.5l-6 3 6 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="7" r="3" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="18" cy="17" r="3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function CopyIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="5" y="5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" opacity="0.6" />
    </svg>
  );
}
function PrintIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 9V4h10v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="5" y="9" width="14" height="8" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 17h10v3H7z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function Chevron({ open }) {
  return (
    <svg className={'mt-1 h-5 w-5 shrink-0 transition-transform ' + (open ? 'rotate-180' : '')} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PlayIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function StyleHelpers() {
  return (
    <style>{`
      .btn-subtle {
        @apply inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30;
      }
      .btn-icon {
        @apply inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50;
      }
      .btn-xsm {
        @apply inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50;
      }
      .seg-item {
        @apply inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] sm:text-xs font-medium
               text-slate-700 hover:bg-slate-50 active:bg-slate-100
               focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/20;
      }
    `}</style>
  );
}

/* -------------------- Motion variants -------------------- */
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};
