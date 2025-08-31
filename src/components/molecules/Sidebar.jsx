'use client';

import Link from 'next/link';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { LayoutDashboard, Users, ShieldCheck, Dumbbell, ClipboardList, CalendarRange, Apple, NotebookPen, Send, LineChart, CheckCircle2, MessageSquare, Bell, Settings, FileClock, UserCog, ServerCog, X, CreditCard, QrCode, Wrench, Salad } from 'lucide-react';
import { useMemo, useState } from 'react';
import { usePathname } from '@/i18n/navigation';

const spring = { type: 'spring', stiffness: 360, damping: 30, mass: 0.7 };

// /dashboard/user/id
// /dashboard/billing

const nav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Exercises', href: '/dashboard/workouts', icon: Dumbbell },
  { name: 'Workout Plans', href: '/dashboard/workouts/plans', icon: ClipboardList },
  { name: 'Programs', href: '/dashboard/programs', icon: CalendarRange },
  { name: 'Food Database', href: '/dashboard/nutrition', icon: Apple },
  { name: 'Meal Plans', href: '/dashboard/nutrition/meal-plans', icon: NotebookPen },
  { name: 'Assignments', href: '/dashboard/assignments', icon: Send },
  { name: 'Progress', href: '/dashboard/progress', icon: LineChart },
  { name: 'Check-ins', href: '/dashboard/progress/check-ins', icon: CheckCircle2 },
  { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'Admin', href: '/dashboard/admin', icon: Settings },
  { name: 'Audit Logs', href: '/dashboard/admin/audit-logs', icon: FileClock },
  { name: 'Profile Settings', href: '/dashboard/settings/profile', icon: UserCog },
  { name: 'System Settings', href: '/dashboard/settings/system', icon: ServerCog },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Attendance', href: '/dashboard/attendance', icon: QrCode },
  { name: 'Schedule', href: '/dashboard/schedule', icon: CalendarRange },
  { name: 'CRM', href: '/dashboard/crm', icon: Users },
  { name: 'Reports', href: '/dashboard/reports', icon: LineChart },
  { name: 'Content', href: '/dashboard/content', icon: NotebookPen },
  { name: 'Operations', href: '/dashboard/operations', icon: Wrench },

  { name: 'My Dashboard', href: '/dashboard/my', icon: LayoutDashboard },
  { name: 'My Workouts', href: '/dashboard/my/workouts', icon: Dumbbell },
  { name: 'My Nutrition', href: '/dashboard/my/nutrition', icon: Salad },
  { name: 'My Calendar', href: '/dashboard/my/calendar', icon: CalendarRange },
  { name: 'My Progress', href: '/dashboard/my/progress', icon: LineChart },
  { name: 'Messages', href: '/dashboard/my/messages', icon: MessageSquare },
];

function NavItem({ item, isActive, isPreviewed, onMouseEnter, onMouseLeave, onClick }) {
  const Icon = item.icon;

  return (
    <Link href={item.href} className='block' onClick={onClick} aria-current={isActive ? 'page' : undefined}>
      <div className='relative'>
        {isPreviewed && <motion.span layoutId='activePill' className='absolute inset-0 before:!rounded-md !rounded-md bg-second shadow-lg' transition={spring} />}

        <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} transition={spring} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} className={['relative z-10 flex items-center gap-3 rounded-md p-2 border transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60', isPreviewed ? 'border-transparent text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'].join(' ')}>
          <div className={['flex items-center justify-center w-8 h-8 rounded-lg', isPreviewed ? 'bg-white/20' : 'bg-slate-100'].join(' ')}>
            <Icon className={isPreviewed ? 'size-5 text-white' : 'size-5 text-indigo-600'} />
          </div>

          <div className={['flex-1 font-medium', isPreviewed ? 'text-white drop-shadow-sm' : ''].join(' ')}>{item.name}</div>
        </motion.div>
      </div>
    </Link>
  );
}

export default function Sidebar({ open, setOpen }) {
  const pathname = usePathname();

  const activeHref = useMemo(() => {
    const isActive = href => pathname === href || pathname?.endsWith(href + '/');
    const found = nav.find(n => isActive(n.href));
    return found?.href ?? '/dashboard';
  }, [pathname]);

  const [hoveredHref, setHoveredHref] = useState(null);
  const pillTarget = hoveredHref || activeHref;

  const isActive = href => href === activeHref || pathname?.startsWith(href + '/');

  return (
    <>
      <aside className=' hidden lg:flex lg:flex-col w-[300px] shrink-0 border-r border-slate-200 bg-white'>
        <div className='flex h-screen flex-col'>
          {/* Brand */}
          <div className='sticky top-0 z-10 h-[63px] flex items-center gap-2 px-5 border-b border-slate-200 bg-white'>
            <motion.div initial={{ rotate: -8, scale: 0.9 }} animate={{ rotate: 0, scale: 1 }} transition={spring} className='  bg-main h-9 w-9 grid place-content-center rounded-xl text-slate-500 shadow-md'>
              <Dumbbell className='size-5' />
            </motion.div>
            <div>
              <div className='text-sm text-slate-500'>Welcome</div>
              <div className='font-semibold'>Amazing UI</div>
            </div>
          </div>

          {/* Nav */}
          <LayoutGroup id='sidebar-nav'>
            <nav dir='rtl' className='flex-1 overflow-y-auto  ' role='navigation' aria-label='Sidebar'>
              <div dir='ltr' className='px-2 py-4 space-y-2' >
                {nav.map(item => {
                  const isPreviewed = pillTarget === item.href;
                  return <NavItem key={item.href} item={item} isActive={isActive(item.href)} isPreviewed={isPreviewed} onMouseEnter={() => setHoveredHref(item.href)} onMouseLeave={() => setHoveredHref(null)} />;
                })}
              </div>
            </nav>
          </LayoutGroup>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div key='overlay' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className='fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden' />
            <motion.aside key='drawer' initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={spring} className='fixed z-50 top-0 left-0 h-dvh w-[280px] bg-white border-r border-slate-200 lg:hidden' aria-label='Mobile Sidebar'>
              {/* header */}
              <div className='h-[72px] px-4 border-b border-slate-200 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='size-8 rounded-xl bg-emerald-500 shadow ring-4 ring-emerald-100' />
                  <div className='font-semibold'>Amazing UI</div>
                </div>
                <button onClick={() => setOpen(false)} className='inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white active:scale-95' aria-label='Close menu'>
                  <X className='w-4 h-4' />
                </button>
              </div>

              {/* nav */}
              <LayoutGroup id='sidebar-nav-mobile'>
                <nav className='w-full overflow-y-auto px-3 pt-4 space-y-2'>
                  {nav.map(item => {
                    const isPreviewed = pillTarget === item.href;
                    return <NavItem key={item.href} item={item} isActive={isActive(item.href)} isPreviewed={isPreviewed} onMouseEnter={() => setHoveredHref(item.href)} onMouseLeave={() => setHoveredHref(null)} onClick={() => setOpen(false)} />;
                  })}
                </nav>
              </LayoutGroup>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
