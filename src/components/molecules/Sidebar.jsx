'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '@/utils/axios';
import Link from 'next/link';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { LayoutDashboard, Users, User as UserIcon, ClipboardList, Apple, NotebookPen, MessageSquare, Calculator, FileBarChart, ChefHat, ChevronDown, ChevronLeft, ChevronRight, X, Newspaper, ServerCog, AlarmClock, RotateCcw } from 'lucide-react';
import { usePathname } from '@/i18n/navigation';
import { useUser } from '@/hooks/useUser';
import { FaInbox, FaUsers, FaWpforms } from 'react-icons/fa';
import { useTranslations } from 'next-intl';
import { useValues } from '@/context/GlobalContext';

const spring = { type: 'spring', stiffness: 380, damping: 28, mass: 0.7 };
const flyoutSpring = { type: 'spring', stiffness: 420, damping: 30, mass: 0.7 };

function cn(...args) {
  return args.filter(Boolean).join(' ');
}

export function cls(...inputs) {
  return inputs.flat(Infinity).filter(Boolean).join(' ');
}

/* ----------------------------- NAV (unchanged) ----------------------------- */
export const NAV = [
  // CLIENT
  {
    role: 'client',
    sectionKey: 'sections.mySpace',
    items: [
      { nameKey: 'myWorkouts', href: '/dashboard/my/workouts', icon: ClipboardList },
      { nameKey: 'myNutrition', href: '/dashboard/my/nutrition', icon: Apple },
      { nameKey: 'myReminders', href: '/dashboard/reminders', icon: AlarmClock },
      { nameKey: 'weeklyStrength', href: '/dashboard/my/report', icon: Newspaper },
      { nameKey: 'calorieCalculator', href: '/dashboard/calculator', icon: Calculator },
      { nameKey: 'messages', href: '/dashboard/chat', icon: MessageSquare },
      { nameKey: 'profile', href: '/dashboard/my/profile', icon: UserIcon },
    ],
  },
  // COACH
  {
    role: 'coach',
    sectionKey: 'sections.overview',
    items: [
      { nameKey: 'allUsers', href: '/dashboard/users', icon: Users },
      { nameKey: 'allExercises', href: '/dashboard/workouts', icon: ClipboardList },
    ],
  },
  {
    role: 'coach',
    sectionKey: 'sections.clientManagement',
    items: [
      { nameKey: 'workoutPlans', href: '/dashboard/workouts/plans', icon: NotebookPen },
      { nameKey: 'mealPlans', href: '/dashboard/nutrition', icon: ChefHat },
      { nameKey: 'reports', href: '/dashboard/reports', icon: FileBarChart },
      { nameKey: 'messages', href: '/dashboard/chat', icon: MessageSquare },
      { nameKey: 'calorieCalculator', href: '/dashboard/calculator', icon: Calculator },
    ],
  },
  // ADMIN
  {
    role: 'admin',
    sectionKey: 'sections.overview',
    items: [
      { nameKey: 'allUsers', href: '/dashboard/users', icon: Users },
      { nameKey: 'allExercises', href: '/dashboard/workouts', icon: ClipboardList },
    ],
  },
  {
    role: 'admin',
    sectionKey: 'sections.programs',
    items: [
      { nameKey: 'workoutPlans', href: '/dashboard/workouts/plans', icon: NotebookPen },
      { nameKey: 'mealPlans', href: '/dashboard/nutrition', icon: ChefHat },
    ],
  },
  {
    role: 'admin',
    items: [
      {
        nameKey: 'clientIntake',
        icon: FaUsers,
        expand: false,
        children: [
          { nameKey: 'manageForms', href: '/dashboard/intake/forms', icon: FaWpforms },
          { nameKey: 'responses', href: '/dashboard/intake/responses', icon: FaInbox },
        ],
      },
    ],
  },
  {
    role: 'admin',
    sectionKey: 'sections.operations',
    items: [
      { nameKey: 'messages', href: '/dashboard/chat', icon: MessageSquare },
      { nameKey: 'calorieCalculator', href: '/dashboard/calculator', icon: Calculator },
      { nameKey: 'reports', href: '/dashboard/reports', icon: FileBarChart },
      { nameKey: 'systemSettings', href: '/dashboard/settings', icon: ServerCog },
    ],
  },
  // SUPER ADMIN
  {
    role: 'super_admin',
    sectionKey: 'sections.overview',
    items: [
      { nameKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
      { nameKey: 'allUsers', href: '/dashboard/super-admin/users', icon: Users },
      { nameKey: 'allExercises', href: '/dashboard/workouts', icon: ClipboardList },
    ],
  },
];

/* ----------------------------- helpers ---------------------------------- */
function isPathActive(pathname, href) {
  if (!href) return false;
  return pathname === href || pathname?.endsWith(href + '/');
}

function anyChildActive(pathname, children = []) {
  return children.some(c => isPathActive(pathname, c.href));
}

/* --------------------------- tiny utilities --------------------------- */
function useLocalStorageState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const v = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      return v == null ? initialValue : JSON.parse(v);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue];
}

/* ---------------------- Collapsed tooltip + flyout ---------------------- */
// Tooltip rendered via portal so it is NOT clipped by sidebar overflow
function CollapsedTooltip({ label, anchorRef }) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top: rect.top + rect.height / 2,
      left: rect.right + 8,
    });
  }, [anchorRef]);

  if (!mounted || !pos) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0, x: 4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 4 }}
      transition={spring}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        transform: 'translateY(-50%)',
        zIndex: 9999,
      }}>
      <div className='rounded-lg bg-slate-900 text-white text-xs px-2.5 py-1.5 shadow-lg shadow-slate-900/50'>{label}</div>
    </motion.div>,
    document.body,
  );
}

function Flyout({ children, align = 'start' }) {
  return (
    <motion.div role='menu' initial={{ opacity: 0, y: 4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.98 }} transition={flyoutSpring} className={cn('absolute z-50 top-0 ms-[68px] min-w-[220px] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden', align === 'end' && 'origin-top-left')}>
      {children}
    </motion.div>
  );
}

/** ----------------------------------------------------------------
 * NavItem (leaf & parent)
 ------------------------------------------------------------------*/
function NavItem({ item, pathname, depth = 0, onNavigate, collapsed = false, t, totalUnread }) {
  const Icon = item.icon || LayoutDashboard;
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const label = t(`items.${item.nameKey}`);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const liRef = useRef(null);

  useEffect(() => {
    if (collapsed) return;
    if (hasChildren) {
      if (item.expand) setOpen(true);
      else setOpen(anyChildActive(pathname, item.children) || isPathActive(pathname, item.href));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, collapsed]);

  const onKeyToggle = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(v => !v);
    }
  };

  /* ------------------------- Collapsed mode ------------------------- */
  if (collapsed) {
    const firstChildHref = hasChildren ? item.children.find(c => c.href)?.href : null;
    const href = hasChildren ? firstChildHref : item.href;
    const active = isPathActive(pathname, href || '');
    return (
      <div ref={liRef} className='relative group' onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        {href ? (
          <Link href={href} onClick={onNavigate} className='block' aria-label={label} title={label}>
            <div className={cn('relative flex items-center justify-center rounded-xl p-1.5 transition-all border', active ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm shadow-indigo-100' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-200')}>
              <div className={cn('grid place-content-center w-10 h-10 rounded-lg transition-colors', active ? 'bg-indigo-600 text-white' : ' bg-indigo-50 text-indigo-700')}>
                <Icon className='size-5' />
              </div>

              {active && <motion.span layoutId='active-pill' className='absolute inset-y-2 ltr:-right-[6px] rtl:-left-[6px] w-[3px] rounded-full bg-indigo-500' />}
            </div>
          </Link>
        ) : (
          <button type='button' aria-label={label} title={label} className='w-full'>
            <div className='relative flex items-center justify-center rounded-xl p-1.5 transition-colors border border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-200'>
              <div className='grid place-content-center w-10 h-10 rounded-lg bg-indigo-50  text-indigo-700'>
                <Icon className='size-5' />
              </div>
            </div>
          </button>
        )}

        {/* Tooltip via portal */}
        <AnimatePresence>{hover && !hasChildren && <CollapsedTooltip label={label} anchorRef={liRef} />}</AnimatePresence>

        {/* Flyout for children */}
        <AnimatePresence>
          {hover && hasChildren && (
            <Flyout>
              <div className='py-2'>
                <div className='px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500'>{label}</div>
                <div className='px-2 space-y-1.5'>
                  {item.children.map(child => {
                    const A = child.icon || LayoutDashboard;
                    const activeChild = isPathActive(pathname, child.href);
                    return (
                      <Link key={child.href} href={child.href} onClick={onNavigate} className={cn('flex items-center gap-3 rounded-lg px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-200', activeChild ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50 text-slate-700')}>
                        <span className={cn('grid place-content-center w-8 h-8 rounded-md', activeChild ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700')}>
                          <A className='size-4' />
                        </span>
                        <span className='text-sm font-medium truncate'>{t(`items.${child.nameKey}`)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </Flyout>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* ------------------------- Expanded mode (no children) ------------------------- */
  if (!hasChildren) {
    const active = isPathActive(pathname, item.href);
    return (
      <Link href={item.href} onClick={onNavigate} className='block group'>
        <div className={cn('relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all border overflow-visible', active ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm shadow-indigo-100' : 'border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200')} style={{ paddingInlineStart: depth ? 10 + depth * 14 : 12 }} aria-current={active ? 'page' : undefined}>
          {active && <motion.span layoutId='active-rail' className='absolute inset-y-2 ltr:-left-[6px] rtl:-right-[6px] w-[3px] rounded-full bg-indigo-500' transition={spring} />}

          <div className={cn('relative z-10 grid place-content-center w-8 h-8 rounded-lg transition-colors', active ? 'bg-indigo-600 text-white' : ' bg-indigo-50  text-indigo-700')}>
            <Icon className='size-5' />
          </div>

          <div className='relative z-10 flex-1 font-medium truncate text-sm'>{label}</div>

          {item.nameKey === 'messages' && totalUnread > 0 && (
            <div className='relative z-10'>
              <Badge value={totalUnread} />
            </div>
          )}
        </div>
      </Link>
    );
  }

  /* ------------------------- Expanded mode (with children) ------------------------- */
  return (
    <div className='w-full  '>
      <button type='button' onClick={() => setOpen(v => !v)} onKeyDown={onKeyToggle} className={cn('w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all border', open ? 'bg-slate-50 text-slate-900 border-slate-200' : 'text-slate-700 hover:bg-slate-50 border-transparent hover:border-slate-200')} style={{ paddingInlineStart: depth ? 10 + depth * 14 : 12 }} aria-expanded={open}>
        <span className='grid place-content-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700'>
          <Icon className='size-5' />
        </span>
        <span className='rtl:text-right flex-1 font-semibold truncate text-sm'>{label}</span>
        <motion.span initial={false} animate={{ rotate: open ? 180 : 0 }} transition={spring} className='text-slate-400'>
          <ChevronDown className='size-4' />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div key='submenu' id={`submenu-${item.nameKey || item.href || label}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className='overflow-hidden'>
            <ul className={cn('relative ltr:ml-1 rtl:mr-1 pl-5 mt-1 space-y-0.5', "before:content-[''] before:absolute", 'ltr:before:left-3 rtl:before:right-3', 'before:top-0 before:bottom-0 before:w-px before:bg-slate-200/70')}>
              {item.children.map((child, idx) => {
                const isLast = idx === item.children.length - 1;
                return (
                  <li key={child.href || child.nameKey} className={cn('relative py-0.5', isLast && "after:content-[''] after:absolute ltr:after:left-3 rtl:after:right-3 after:bottom-0 after:h-3 after:w-px after:bg-white")}>
                    <div className={cn('relative', "before:content-[''] before:absolute before:top-1/2 before:-translate-y-1/2 before:h-px before:w-4 before:bg-slate-200/70", 'ltr:before:left-[-1rem] rtl:before:right-[-1rem]')}>
                      <NavItem item={child} pathname={pathname} depth={depth + 1} onNavigate={onNavigate} t={t} totalUnread={totalUnread} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** ----------------------------------------------------------------
 * Section with translated title
 ------------------------------------------------------------------*/
function NavSection({ sectionKey, items, pathname, onNavigate, collapsed = false, t, totalUnread = 0 }) {
  const sectionLabel = sectionKey ? t(sectionKey) : null;
  return (
    <div className='mb-1'>
      {!collapsed && sectionLabel ? <div className='px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500'>{sectionLabel}</div> : null}

      <div className={cn('space-y-1.5', collapsed ? 'px-0.5' : 'px-1')}>
        {items.map(item => (
          <NavItem key={item.href || item.nameKey} item={item} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} t={t} totalUnread={totalUnread} />
        ))}
      </div>
    </div>
  );
}

/** ----------------------------------------------------------------
 * Scroll shadows (top/bottom) – light theme
 ------------------------------------------------------------------*/
function ScrollShadow({ children }) {
  const ref = useRef(null);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setAtTop(scrollTop <= 0);
    setAtBottom(scrollTop + clientHeight >= scrollHeight - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  return (
    <div className='relative h-full'>
      <div ref={ref} className='h-full overflow-y-auto'>
        {children}
      </div>

      {/* top shadow */}
      <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-white to-transparent transition-opacity', atTop ? 'opacity-0' : 'opacity-100')} />
      {/* bottom shadow */}
      <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white to-transparent transition-opacity', atBottom ? 'opacity-0' : 'opacity-100')} />
    </div>
  );
}

/** ----------------------------------------------------------------
 * Sidebar root – light theme
 ------------------------------------------------------------------*/
export default function Sidebar({ open, setOpen, collapsed: collapsedProp, setCollapsed: setCollapsedProp }) {
  const pathname = usePathname();
  const user = useUser();
  const role = user?.role ?? null;
  const t = useTranslations('nav');
  const { totalUnread } = useUnreadChats();

  const [collapsedLS, setCollapsedLS] = useLocalStorageState('sidebar:collapsed', false);
  const collapsed = typeof collapsedProp === 'boolean' ? collapsedProp : collapsedLS;
  const setCollapsed = typeof setCollapsedProp === 'function' ? setCollapsedProp : setCollapsedLS;

  const sections = useMemo(() => {
    if (!role) return null;
    return NAV.filter(s => s.role === role);
  }, [role]);

  const onNavigate = () => setOpen && setOpen(false);

  return (
    <>
      {/* DESKTOP */}
      <aside className={cn('rtl:border-l ltr:border-r border-slate-200 hidden lg:flex lg:flex-col shrink-0 transition-[width] duration-300', 'border-r border-slate-200 bg-white text-slate-900', collapsed ? 'w-[72px]' : 'w-[280px]')}>
        <div className='flex h-screen flex-col'>
          {/* Header */}
          <div className={cn('h-[64px] border-b border-slate-200 flex items-center gap-3 bg-white/90 backdrop-blur', 'px-3')}>
            <div className='flex items-center gap-2 flex-1 min-w-0'>
              <div className='relative flex items-center justify-center rounded-xl bg-slate-100 border border-slate-200 shadow-sm w-10 h-10'>
                <img src='/logo/logo1.png' alt='Logo' className='w-7 h-7 object-contain' />
              </div>

              {!collapsed && (
                <div className='flex flex-col min-w-0'>
                  <span className='text-[11px] uppercase tracking-[0.18em] text-slate-400'>{t('brand.portalTitle')}</span>
                  <span className='text-sm font-semibold text-slate-800 truncate'>
                    {role === 'super_admin' && t('brand.superAdminPortal')}
                    {role === 'admin' && t('brand.adminPortal')}
                    {role === 'coach' && t('brand.coachPortal')}
                    {role === 'client' && t('brand.clientPortal')}
                  </span>
                </div>
              )}
            </div>

            {/* Collapse / expand */}
            <button onClick={() => setCollapsed(v => !v)} className={cn('inline-flex items-center justify-center rounded-lg', 'border border-slate-200 bg-white', 'h-9 w-9 text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50', 'active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-200')} title={collapsed ? t('tooltips.expand') : t('tooltips.collapse')} aria-label={collapsed ? t('tooltips.expand') : t('tooltips.collapse')}>
              {collapsed ? <ChevronRight className='w-4 h-4 rtl:scale-x-[-1]' /> : <ChevronLeft className='rtl:scale-x-[-1] w-4 h-4' />}
            </button>
          </div>

          {/* Nav with scroll shadow */}
          <LayoutGroup id='sidebar-nav'>
            <div className='flex-1 py-3'>
              <ScrollShadow>
                <nav className={cn(collapsed ? 'px-1.5 space-y-3' : 'px-2.5 space-y-4')}>
                  {sections?.map(section => (
                    <NavSection key={section.sectionKey || section.items[0]?.nameKey} sectionKey={section.sectionKey} items={section.items} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} t={t} totalUnread={totalUnread} />
                  ))}
                </nav>
              </ScrollShadow>
            </div>
          </LayoutGroup>

          {/* Footer (reload) */}
          <div className='p-3 border-t border-slate-200'>
            <ReloadButton collapsed={collapsed} t={t} />
          </div>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div key='overlay' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen && setOpen(false)} className='fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden' />
            <motion.aside key='drawer' initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={spring} className='fixed z-50 top-0 left-0 h-dvh w-[300px] bg-white text-slate-900 border-r border-slate-200 lg:hidden' aria-label='Mobile Sidebar'>
              <div className='h-[68px] px-4 border-b border-slate-200 flex items-center justify-between bg-white/90 backdrop-blur'>
                <div className='flex items-center gap-3'>
                  <div className='size-9 rounded-xl grid place-content-center text-white shadow-sm bg-gradient-to-br from-indigo-600 to-violet-600'>
                    <LayoutDashboard className='w-4 h-4' />
                  </div>

                  <div className='flex flex-col'>
                    <span className='text-[11px] uppercase tracking-[0.18em] text-slate-400'>{t('brand.portalTitle')}</span>
                    <span className='font-semibold text-slate-900 text-[15px]'>
                      {role === 'super_admin' && t('brand.superAdminPortal')}
                      {role === 'admin' && t('brand.adminPortal')}
                      {role === 'coach' && t('brand.coachPortal')}
                      {role === 'client' && t('brand.clientPortal')}
                    </span>
                  </div>
                </div>

                <button onClick={() => setOpen && setOpen(false)} className='inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-200' aria-label={t('tooltips.closeMenu')} title={t('tooltips.closeMenu')}>
                  <X className='w-4 h-4' />
                </button>
              </div>

              <LayoutGroup id='sidebar-nav-mobile'>
                <div className='h-[calc(100vh-68px)]'>
                  <ScrollShadow>
                    <nav className='w-full px-2.5 pt-4 pb-6 space-y-4'>
                      {sections?.map(section => (
                        <NavSection totalUnread={totalUnread} key={section.sectionKey || section.items[0]?.nameKey} sectionKey={section.sectionKey} items={section.items} pathname={pathname} onNavigate={onNavigate} t={t} />
                      ))}
                    </nav>
                    <div className='px-3 mt-auto pb-3'>
                      <ReloadButton collapsed={false} t={t} />
                    </div>
                  </ScrollShadow>
                </div>
              </LayoutGroup>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/** ----------------------------------------------------------------
 * Unread chats hook
 ------------------------------------------------------------------*/
export function useUnreadChats(pollMs = 300000) {
  const [total, setTotal] = useState(0);
  const { conversationId } = useValues();

  async function load() {
    try {
      const unread = await api.get('/chat/unread');
      setTotal(unread?.data?.totalUnread);
    } catch {}
  }

  useEffect(() => {
    load();
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [pollMs, conversationId]);

  return { totalUnread: total, reloadUnread: load };
}

/** ----------------------------------------------------------------
 * Badge
 ------------------------------------------------------------------*/
function Badge({ value, className = '' }) {
  const text = value > 99 ? '99+' : String(value);
  return (
    <span className={'inline-flex min-w-5 h-5 items-center justify-center rounded-full text-[10px] font-semibold ' + 'bg-red-600 text-white px-1.5 ' + className} aria-label={`${value} unread`}>
      {text}
    </span>
  );
}

/** ----------------------------------------------------------------
 * Reload button
 ------------------------------------------------------------------*/
function ReloadButton({ collapsed, t }) {
  return (
    <button
      onClick={() => window.location.reload()}
      className={
        collapsed
          ? `
            mx-auto flex items-center justify-center 
            w-10 h-10 rounded-lg
            bg-indigo-600 text-white 
            shadow-sm hover:shadow-md 
            hover:bg-indigo-700 
            active:scale-95 
            transition-all duration-200
          `
          : `
            flex w-full items-center gap-3
            bg-indigo-600 text-white 
            px-4 py-3 rounded-xl font-medium 
            shadow-sm hover:shadow-md
            hover:bg-indigo-700 
            active:scale-95 
            transition-all duration-200
          `
      }>
      <div
        className={`
          flex items-center justify-center 
          w-5 h-5
        `}>
        <RotateCcw className='w-5 h-5' strokeWidth={2.2} />
      </div>

      {!collapsed && <span className='text-sm font-medium tracking-wide'>{t('reload-page')}</span>}
    </button>
  );
}
