'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import Link from 'next/link';
import { MotionConfig, AnimatePresence, motion, LayoutGroup } from 'framer-motion';
import { useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  FolderTree,
  ShoppingBag,
  ArrowUpRight,
  Package,
  Wallet,
  FileText,
  HelpCircle,
  NotebookPen,
  BookOpen,
  Scale,
  Settings,
  ChevronRight,
} from 'lucide-react';

const spring = { type: 'spring', stiffness: 420, damping: 32, mass: 0.7 };

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Categories', href: '/dashboard/categories', icon: FolderTree },
  { name: 'Services', href: '/dashboard/services', icon: ShoppingBag },
  { name: 'Level Up', href: '/dashboard/levelup', icon: ArrowUpRight },
  { name: 'Orders', href: '/dashboard/orders', icon: Package },
  { name: 'Withdraw', href: '/dashboard/withdraw', icon: Wallet },
  { name: 'Invoices', href: '/dashboard/invoices', icon: FileText },
  { name: 'FAQs', href: '/dashboard/faqs', icon: HelpCircle },
  { name: 'Blogs', href: '/dashboard/blogs', icon: NotebookPen },
  { name: 'Guides', href: '/dashboard/guides', icon: BookOpen },
  { name: 'Terms & Policies', href: '/dashboard/terms-policies', icon: Scale },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const listVariants = {
  hidden: { opacity: 0 },
  visible: (delayBase = 0) => ({
    opacity: 1,
    transition: { staggerChildren: 0.045, delayChildren: delayBase },
  }),
};

const itemVariants = {
  hidden: { opacity: 0, x: -14, filter: 'blur(4px)' },
  visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: spring },
};

export default function Sidebar({ open = false, setOpen = () => {} }) {
  const pathname = usePathname();
  const router = useRouter();

  const activeIndex = useMemo(
    () => menuItems.findIndex((i) => pathname === i.href || pathname?.startsWith(i.href + '/')),
    [pathname]
  );

  return (
    <MotionConfig reducedMotion="user">
      {/* mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.button
            aria-label="Close sidebar"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* sidebar */}
      <AnimatePresence initial={false}>
        {/* render on desktop always; on mobile only when open */}
        {(open || typeof window === 'undefined') && (
          <motion.aside
            role="navigation"
            aria-label="Dashboard sidebar"
            className="fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white/80 backdrop-blur-xl shadow-xl lg:static lg:z-auto lg:translate-x-0 lg:w-72"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={spring}
          >
            {/* wrapper to ensure full height & inner scroll */}
            <div className="flex h-screen flex-col">
              {/* brand */}
              <div className="relative z-10 flex h-16 items-center justify-center bg-gradient-to-r from-indigo-600 to-emerald-500 text-white shadow-sm">
                <motion.h1
                  className="text-base font-semibold tracking-wide"
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.05, ...spring }}
                >
                  Admin Dashboard
                </motion.h1>
              </div>

              {/* menu (inner scroll area) */}
              <LayoutGroup id="sidebar-nav">
                <motion.nav
                  className="relative flex-1 overflow-y-auto px-3 py-4"
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                  custom={0.08}
                >
                  <ul className="space-y-1">
                    {menuItems.map((item, idx) => {
                      const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                      const Icon = item.icon;

                      return (
                        <motion.li key={item.name} variants={itemVariants}>
                          <Link
                            prefetch
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            className="group relative block"
                          >
                            {/* animated active pill (moves between tabs) */}
                            {isActive && (
                              <motion.span
                                layoutId="active-pill"
                                className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500"
                                transition={spring}
                              />
                            )}

                            <div
                              className={[
                                'relative z-10 flex h-11 items-center gap-3 rounded-xl px-4 transition-colors',
                                isActive
                                  ? 'text-white'
                                  : 'text-slate-700 hover:text-indigo-700 hover:bg-slate-100/70',
                              ].join(' ')}
                            >
                              {/* left accent bar animates on active */}
                              <motion.span
                                className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1.5 rounded-r bg-indigo-600"
                                initial={{ opacity: 0, scaleY: 0.2 }}
                                animate={isActive ? { opacity: 1, scaleY: 1 } : { opacity: 0, scaleY: 0 }}
                                transition={spring}
                              />

                              {/* icon */}
                              <motion.span
                                className="grid size-7 place-content-center rounded-lg"
                                initial={false}
                                animate={isActive ? { rotate: 0, scale: 1 } : { rotate: -2, scale: 0.96 }}
                                whileHover={{ rotate: 4, scale: 1.02 }}
                                transition={spring}
                              >
                                <Icon className={isActive ? 'size-5 text-white' : 'size-5 text-indigo-600'} />
                              </motion.span>

                              {/* label */}
                              <span
                                className={[
                                  'text-sm font-medium',
                                  isActive ? 'text-white drop-shadow-sm' : 'text-slate-700',
                                ].join(' ')}
                              >
                                {item.name}
                              </span>

                              {/* caret */}
                              <motion.span
                                className={[
                                  'ml-auto',
                                  isActive ? 'text-white/90' : 'text-slate-400 group-hover:text-indigo-600',
                                ].join(' ')}
                                initial={false}
                                animate={{ x: isActive ? 0 : 0 }}
                                whileHover={{ x: 4 }}
                                transition={spring}
                              >
                                <ChevronRight className="size-4" />
                              </motion.span>
                            </div>
                          </Link>
                        </motion.li>
                      );
                    })}
                  </ul>
                </motion.nav>
              </LayoutGroup>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* desktop spacer to keep page content aligned when sidebar is fixed */}
      <div className="hidden w-72 shrink-0 lg:block" />
    </MotionConfig>
  );
}
