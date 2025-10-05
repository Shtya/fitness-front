'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { LayoutDashboard, Users, User as UserIcon, Shield, ShieldCheck, Dumbbell, ClipboardList, CalendarRange, Apple, NotebookPen, MessageSquare, CreditCard, ChefHat, ShoppingCart, Calculator, LineChart, Salad, Settings as SettingsIcon, ServerCog, ChevronDown, X, UtensilsCrossed } from 'lucide-react';
import { usePathname } from '@/i18n/navigation';
import { useUser } from '@/hooks/useUser';
import { FaRegFilePowerpoint } from 'react-icons/fa';

const spring = { type: 'spring', stiffness: 380, damping: 28, mass: 0.7 };

function cn(...a) {
  return a.filter(Boolean).join(' ');
}

const NAV = [
  // -------------------- COACH --------------------
  {
    role: 'client',
    section: 'My Space',
    items: [
      { name: 'Dashboard', href: '/dashboard/my', icon: LayoutDashboard },
      {
        name: 'Training',
        icon: Dumbbell,
        children: [
          { name: 'My Workouts', href: '/dashboard/my/workouts', icon: ClipboardList },
          { name: 'Progress', href: '/dashboard/my/progress', icon: LineChart },
          { name: 'Calendar', href: '/dashboard/my/calendar', icon: CalendarRange },
        ],
      },
      {
        name: 'Nutrition',
        icon: Salad,
        children: [
          { name: 'My Nutrition', href: '/dashboard/my/nutrition', icon: Apple },
          { name: 'Food Library', href: '/dashboard/nutrition/library-food-list', icon: ChefHat },
          { name: 'Grocery List', href: '/dashboard/nutrition/grocery-list', icon: ShoppingCart },
          { name: 'Calorie Calculator', href: '/dashboard/nutrition/calculator', icon: Calculator },
        ],
      },
      { name: 'Profile', href: '/dashboard/my/profile', icon: UserIcon },
    ],
  },
  {
    role: 'coach',
    section: 'My Space',
    items: [
      { name: 'Dashboard', href: '/dashboard/my', icon: LayoutDashboard },
      {
        name: 'Training',
        icon: Dumbbell,
        children: [
          { name: 'My Workouts', href: '/dashboard/my/workouts', icon: ClipboardList },
          { name: 'Progress', href: '/dashboard/my/progress', icon: LineChart },
          { name: 'Calendar', href: '/dashboard/my/calendar', icon: CalendarRange },
        ],
      },
      {
        name: 'Nutrition',
        icon: Salad,
        children: [
          { name: 'My Nutrition', href: '/dashboard/my/nutrition', icon: Apple },
          { name: 'Food Library', href: '/dashboard/nutrition/library-food-list', icon: ChefHat },
          { name: 'Grocery List', href: '/dashboard/nutrition/grocery-list', icon: ShoppingCart },
          { name: 'Calorie Calculator', href: '/dashboard/nutrition/calculator', icon: Calculator },
        ],
      },
      { name: 'Profile', href: '/dashboard/my/profile', icon: UserIcon },
    ],
  },

  // -------------------- ADMIN --------------------
  {
    role: 'admin',
    section: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'All Users', href: '/dashboard/users', icon: Users },
      {
        name: 'Workouts',
        icon: Dumbbell,
        expand: true,
        children: [
          { name: 'All Exercises', href: '/dashboard/workouts', icon: ClipboardList },
          { name: 'Workout Programs', href: '/dashboard/workouts/plans', icon: NotebookPen },
        ],
      },
      {
        name: 'Food Library',
        icon: UtensilsCrossed,
        children: [
          { name: 'Foods', href: '/dashboard/nutrition', icon: Apple },
          { name: 'Meal Plans', href: '/dashboard/nutrition/meal-plans', icon: ChefHat },
        ],
      },
    ],
  },
  {
    role: 'admin',
    section: 'Operations',
    items: [
      { name: 'Messages', href: '/dashboard/chat', icon: MessageSquare },
      { name: 'Calculator', href: '/dashboard/calculator', icon: Calculator },
      { name: 'Reports', href: '/dashboard/reports', icon: FaRegFilePowerpoint },
      { name: 'System Settings', href: '/dashboard/settings', icon: ServerCog },
    ],
  },
];

/** ----------------------------------------------------------------
 * Helpers
 ------------------------------------------------------------------*/
function isPathActive(pathname, href) {
  if (!href) return false;
  return pathname === href || pathname?.startsWith(href + '/') || pathname?.endsWith(href + '/');
}

function anyChildActive(pathname, children = []) {
  return children.some(c => isPathActive(pathname, c.href));
}

/** ----------------------------------------------------------------
 * NavItem (handles both leaf links and collapsible parents)
 ------------------------------------------------------------------*/
function NavItem({ item, pathname, depth = 0, onNavigate }) {
  const Icon = item.icon || LayoutDashboard;
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;

  const initiallyOpen = hasChildren && (item.expand || anyChildActive(pathname, item.children) || isPathActive(pathname, item.href));

  const [open, setOpen] = useState(initiallyOpen);

  useEffect(() => {
    if (!hasChildren) return;
    // ✅ if expand is true, keep it open; otherwise follow active route
    if (item.expand) {
      setOpen(true);
    } else {
      setOpen(anyChildActive(pathname, item.children) || isPathActive(pathname, item.href));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!hasChildren) {
    const active = pathname == item.href;
    return (
      <Link href={item.href} onClick={onNavigate} className='block group'>
        <div className={cn('relative flex items-center gap-3 rounded-lg px-3 py-2 transition-colors', active ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-700 hover:bg-slate-50 border border-transparent')} style={{ paddingLeft: depth ? 8 + depth * 14 : 12 }}>
          <div className={cn('flex items-center justify-center w-8 h-8 rounded-md', active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-indigo-600 group-hover:bg-indigo-50')}>
            <Icon className='size-5' />
          </div>
          <div className='flex-1 font-medium truncate'>{item.name}</div>
        </div>
      </Link>
    );
  }

  // Parent (collapsible)
  return (
    <div className='w-full'>
      <button type='button' onClick={() => setOpen(v => !v)} className={cn('w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors', open ? 'bg-slate-50 text-slate-800' : 'hover:bg-slate-50 text-slate-700')} style={{ paddingLeft: depth ? 8 + depth * 14 : 12 }} aria-expanded={open}>
        <div className='flex items-center justify-center w-8 h-8 rounded-md bg-slate-100 text-indigo-600'>
          <Icon className='size-5' />
        </div>
        <div className='flex-1 font-semibold truncate'>{item.name}</div>
        <motion.span initial={false} animate={{ rotate: open ? 180 : 0 }} transition={spring} className='text-slate-400'>
          <ChevronDown className='size-4' />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div key='submenu' initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className='overflow-hidden'>
            <div className='py-1 space-y-1'>
              {item.children.map(child => (
                <NavItem key={child.href || child.name} item={child} pathname={pathname} depth={depth + 1} onNavigate={onNavigate} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** ----------------------------------------------------------------
 * Section with title
 ------------------------------------------------------------------*/
function NavSection({ section, items, pathname, onNavigate }) {
  return (
    <div className='mb-3'>
      {section ? <div className='px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500/80'>{section}</div> : null}
      <div className='px-2 space-y-1'>
        {items.map(item => (
          <NavItem key={item.href || item.name} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

/** ----------------------------------------------------------------
 * SIDEBAR
 ------------------------------------------------------------------*/
export default function Sidebar({ open, setOpen }) {
  const pathname = usePathname();
  const user = useUser();
  const role = user?.role || 'coach'; // fallback to coach

  // Filter by role and group by section
  const sections = useMemo(() => {
    return NAV.filter(s => s.role === role);
  }, [role]);

  const onNavigate = () => {
    // close mobile drawer on navigation
    if (setOpen) setOpen(false);
  };

  return (
    <>
      {/* DESKTOP */}
      <aside className='hidden lg:flex lg:flex-col w-[260px] shrink-0 border-r border-slate-200 bg-white'>
        <div className='flex h-screen flex-col'>
          {/* Nav */}
          <LayoutGroup id='sidebar-nav'>
            <nav className='flex-1 overflow-y-auto py-3'>
              {sections.map(section => (
                <NavSection key={section.section} section={section.section} items={section.items} pathname={pathname} onNavigate={onNavigate} />
              ))}
            </nav>
          </LayoutGroup>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div key='overlay' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className='fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden' />
            <motion.aside key='drawer' initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={spring} className='fixed z-50 top-0 left-0 h-dvh w-[300px] bg-white border-r border-slate-200 lg:hidden' aria-label='Mobile Sidebar'>
              {/* header */}
              <div className='h-[72px] px-4 border-b border-slate-200 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='size-8 rounded-xl bg-indigo-600 shadow ring-4 ring-indigo-100 grid place-content-center text-white'>
                    <LayoutDashboard className='size-4' />
                  </div>
                  <div className='font-semibold'>Coach Portal</div>
                </div>
                <button onClick={() => setOpen(false)} className='inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white active:scale-95' aria-label='Close menu'>
                  <X className='w-4 h-4' />
                </button>
              </div>

              {/* nav */}
              <LayoutGroup id='sidebar-nav-mobile'>
                <nav className='w-full h-[calc(100vh-100px)] overflow-y-auto px-2 pt-4 pb-6 space-y-3'>
                  {sections.map(section => (
                    <NavSection key={section.section} section={section.section} items={section.items} pathname={pathname} onNavigate={onNavigate} />
                  ))}
                </nav>
              </LayoutGroup>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
