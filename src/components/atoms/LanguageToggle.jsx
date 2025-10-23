'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ---------------- helpers: lang & cookie & dir ---------------- */
function setDocumentLangDir(nextLocale) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = nextLocale;
  document.documentElement.dir = nextLocale === 'ar' ? 'rtl' : 'ltr';
}
function setLocaleCookie(nextLocale) {
  if (typeof document === 'undefined') return;
  document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
}
function showGlobalLoader(durationMs = 1200) {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('lang-switch-loader');
  if (existing) existing.remove();

  const root = document.createElement('div');
  root.id = 'lang-switch-loader';
  root.className = ['fixed inset-0 z-[9999] grid place-items-center backdrop-blur-sm', 'bg-black/40'].join(' ');
  root.innerHTML = `
    <div class="relative">
      <div class="h-14 w-14 rounded-full border-4 border-white/30 border-t-white animate-spin"></div>
      <div class="absolute inset-0 rounded-full animate-ping bg-white/10"></div>
    </div>
  `;
  document.body.appendChild(root);
  setTimeout(() => root.remove(), durationMs);
}

function swapLocaleInPath(pathname, nextLocale) {
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length && (segs[0] === 'en' || segs[0] === 'ar')) {
    segs[0] = nextLocale;
    return '/' + segs.join('/');
  }
  return '/' + [nextLocale, ...segs].join('/');
}

export default function LanguageToggle({ className = '', size = 35 }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [focused, setFocused] = useState(false);

  const isEN = locale === 'en';
  const W = Math.max(72, Math.floor(size * 2.0));
  const H = Math.max(28, Math.floor(size));
  const knob = H - 6;

  const nextLocale = isEN ? 'ar' : 'en';
  const nextHref = useMemo(() => {
    const base = swapLocaleInPath(pathname || '/', nextLocale);
    const qs = search?.toString();
    return qs ? `${base}?${qs}` : base;
  }, [pathname, search, nextLocale]);

  function toggle() {
    startTransition(() => {
      showGlobalLoader(1100);
      setLocaleCookie(nextLocale);
      setDocumentLangDir(nextLocale);
      router.replace(nextHref);
      router.refresh();
    });
  }

  useEffect(() => {
    setDocumentLangDir(locale);
  }, [locale]);

  return (
    <motion.button type='button' onClick={toggle} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} aria-label={isEN ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'} className={['relative inline-flex select-none items-center rounded-lg', 'border border-white/20 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600', 'shadow-md hover:brightness-110 active:scale-[0.98] transition-all', 'focus:outline-none', className].join(' ')} style={{ height: H, width: W }} whileTap={{ scale: 0.98 }}>
      <span className='pointer-events-none absolute inset-0 overflow-hidden rounded-lg'>
        <span className='absolute -top-1/2 left-0 right-0 h-full translate-y-1/2 rotate-12 bg-white/10'></span>
        <AnimatePresence>{focused && <motion.span className='absolute inset-0 rounded-lg ring-2 ring-white/40' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}</AnimatePresence>
      </span>

      <div dir='ltr' className='  relative z-10 flex w-full items-center justify-between px-2 text-[12px] font-semibold text-white tracking-wide'>
        <motion.span aria-hidden className={`${isEN ? 'opacity-60 ' : 'opacity-100 text-slate-900'} font-en !font-[800] mt-1`} animate={{ opacity: isEN ? 0.6 : 1, y: isEN ? 0 : 0 }} transition={{ duration: 0.2 }}>
          AR
        </motion.span>
        <motion.span aria-hidden className={`${!isEN ? 'opacity-60' : ' opacity-100 text-slate-900 '}  font-en !font-[800] mt-1 `} animate={{ opacity: !isEN ? 0.6 : 1, y: !isEN ? 0 : 0 }} transition={{ duration: 0.2 }}>
          EN
        </motion.span>
      </div>

      <motion.span
        layout
        className='absolute  rounded-lg bg-white shadow-md'
        style={{
          width: knob,
          height: knob,
          top: 2,
          left: isEN ? W - knob - 3 : 3,
        }}
        transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.7 }}>
        <span className='pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/70 to-white/40' />
      </motion.span>
      <AnimatePresence>{isPending && <motion.span className='pointer-events-none absolute inset-0 z-10 rounded-2xl bg-white/20' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}</AnimatePresence>
    </motion.button>
  );
}
