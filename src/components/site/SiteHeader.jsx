'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import TrialModal from '@/components/site/TrialModal';
import { Button, Container } from '@/components/site/UI';
import { Menu, X } from 'lucide-react';

// Respect reduced-motion users
const baseSpring = { type: 'spring', stiffness: 360, damping: 30, mass: 0.7 };
function useSpring() {
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return prefersReduced ? { type: 'tween', duration: 0.01 } : baseSpring;
}

export default function SiteHeader({ basePath = '/site', announcement }) {
  const pathname = (usePathname() || '/').split('?')[0];
  const spring = useSpring();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);

  // ===== scroll shadow =====
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ===== lock body scroll when drawer open =====
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ===== simple focus trap in drawer =====
  const closeBtnRef = useRef(null);
  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  const items = useMemo(
    () => [
      { slug: 'programs', label: 'Programs' },
      { slug: 'schedule', label: 'Schedule' },
      { slug: 'pricing', label: 'Pricing' },
      { slug: 'coaches', label: 'Coaches' },
      { slug: 'stories', label: 'Stories' },
      { slug: 'blogs', label: 'Blog' }, // NOTE: use slug 'blog' (not 'blogs') to match /site/blog
      { slug: 'events', label: 'Events' },
      { slug: 'gallery', label: 'Gallery' },
      { slug: 'contact', label: 'Contact' },
    ],
    [],
  );

  function href(slug) {
    const p = `${basePath}/${slug}`.replace(/\/\/+/, '/');
    return p === '' ? '/' : p;
  }
  function isActive(h) {
    return pathname === h || pathname.startsWith(h + '/');
  }

  return (
    <header className={`sticky top-0 z-50 border-b border-slate-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 transition-shadow ${scrolled ? 'shadow-[0_8px_30px_rgba(0,0,0,0.06)]' : ''}`}>
      {/* Skip link for a11y */}
      <a href='#main' className='sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-indigo-600 focus:px-3 focus:py-1.5 focus:text-white'>
        Skip to content
      </a>

      {/* Optional announcement bar */}
      {announcement ? (
        <div className='bg-gradient-to-r from-indigo-600 to-blue-500 text-white text-sm'>
          <Container className='h-9 flex items-center justify-center gap-2'>
            <span className='truncate'>{announcement}</span>
          </Container>
        </div>
      ) : null}

      <Container className='h-16 flex items-center justify-between'>
        {/* Brand */}
        <Link href='/' className='font-semibold tracking-tight select-none'>
          Amazing Gym
        </Link>

        {/* Desktop nav */}
        <LayoutGroup id='site-nav'>
          <nav className='hidden md:flex items-center gap-2 relative'>
            {items.map(it => {
              const H = href(it.slug);
              const active = isActive(H);
              return (
                <div key={it.slug} className='relative'>
                  {active && <motion.span layoutId='nav-underline' className='absolute -bottom-2 left-0 right-0 h-[2px] rounded bg-gradient-to-r from-indigo-600 to-blue-500' transition={spring} />}
                  <Link href={H} aria-current={active ? 'page' : undefined} className={`px-3 py-1.5 rounded-xl text-sm transition-colors ${active ? 'text-indigo-700 font-medium' : 'text-slate-700 hover:text-slate-900'}`}>
                    {it.label}
                  </Link>
                </div>
              );
            })}
          </nav>
        </LayoutGroup>

        {/* Actions */}
        <div className='hidden md:flex items-center gap-2'>
          <Button as={Link} href='/dashboard' variant='ghost'>
            Dashboard
          </Button>
          <Button onClick={() => setTrialOpen(true)}>Book a trial</Button>
        </div>

        {/* Mobile menu button */}
        <button className='md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 bg-white' onClick={() => setOpen(true)} aria-label='Open menu' aria-haspopup='dialog' aria-expanded={open}>
          <Menu className='w-5 h-5' />
        </button>
      </Container>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div key='overlay' className='fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside key='sheet' role='dialog' aria-modal='true' aria-label='Site navigation' className='fixed top-0 right-0 z-50 h-[100dvh] w-[84vw] max-w-sm bg-white border-l border-slate-200 p-4 flex flex-col' initial={{ x: 320 }} animate={{ x: 0 }} exit={{ x: 320 }} transition={spring}>
              <div className='flex items-center justify-between pb-2'>
                <div className='font-semibold'>Amazing Gym</div>
                <button ref={closeBtnRef} className='inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white' onClick={() => setOpen(false)} aria-label='Close menu'>
                  <X className='w-4 h-4' />
                </button>
              </div>

              {/* Nav list */}
              <nav className='mt-2 divide-y divide-slate-100 overflow-y-auto'>
                {items.map(it => {
                  const H = href(it.slug);
                  const active = isActive(H);
                  return (
                    <Link key={it.slug} href={H} className={`block py-3 text-sm ${active ? 'text-indigo-700 font-medium' : 'text-slate-700'}`} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined}>
                      {it.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Bottom actions pinned to safe area */}
              <div className='mt-auto pt-4 flex flex-col gap-2 pb-[max(env(safe-area-inset-bottom),8px)]'>
                <Button as={Link} href='/dashboard' variant='ghost'>
                  dashboard
                </Button>
                <Button
                  onClick={() => {
                    setOpen(false);
                    setTrialOpen(true);
                  }}>
                  Book a trial
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Shared trial modal (works from any page) */}
      <TrialModal open={trialOpen} onClose={() => setTrialOpen(false)} />
    </header>
  );
}
