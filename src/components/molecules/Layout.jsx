'use client';
import { Toaster } from 'react-hot-toast';
import { GlobalProvider } from '../../context/GlobalContext';
import Header from './Header';
import { usePathname } from '../../i18n/navigation';
import Sidebar from './Sidebar';
import ConfigAos from '@/config/Aos';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export default function Layout({ children }) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith('/auth') || pathname.startsWith('/site') || pathname == '/';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (sidebarOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => (document.body.style.overflow = '');
  }, [sidebarOpen]);

  // Simulate page loading
	const reduce = useReducedMotion();
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800); // 0.8s spinner
    return () => clearTimeout(timer);
  }, [pathname]);

  if (loading) {

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="relative h-28 w-28">
        {/* outer glow */}
        <div className="absolute inset-0 rounded-full blur-xl bg-gradient-to-tr from-indigo-400/30 via-sky-400/20 to-purple-400/30" />

        {/* ring 1 */}
        <motion.span
          className="absolute inset-0 rounded-full border-[6px] border-transparent [border-top-color:#6366f1] [border-right-color:#6366f1]/60"
          animate={reduce ? {} : { rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
        />

        {/* ring 2 (counter-rotating, smaller) */}
        <motion.span
          className="absolute inset-2 rounded-full border-[6px] border-transparent [border-bottom-color:#38bdf8] [border-left-color:#38bdf8]/60"
          animate={reduce ? {} : { rotate: -360 }}
          transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
        />

        {/* ring 3 (slow) */}
        <motion.span
          className="absolute inset-4 rounded-full border-[6px] border-transparent [border-top-color:#a78bfa]/70"
          animate={reduce ? {} : { rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
        />

        {/* core pulse */}
        <motion.div
          className="absolute inset-1 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-500"
          animate={reduce ? {} : { scale: [1, 1.06, 1] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
  }

  return (
    <GlobalProvider>
      <div className='bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-800'>
        <div className='container !px-0 flex min-h-dvh '>
          {!isAuthRoute && <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />}

          {/* Main area */}
          <div className='relative flex-1 min-w-0'>
            {!isAuthRoute && <Header onMenu={() => setSidebarOpen(true)} />}

            <AnimatePresence mode='wait'>
              <motion.main key={pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
                <div className={`${!isAuthRoute && 'bg-[#f7f9fc] h-[calc(100vh-65px)] overflow-auto max-md:p-3 p-6'}`}>{children}</div>
              </motion.main>
            </AnimatePresence>
          </div>
        </div>
      </div>
      {/* <PWAInstallPrompt /> */}
      <ConfigAos />
      <Toaster position='top-center' />
    </GlobalProvider>
  );
}
