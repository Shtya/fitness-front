'use client';
import { Toaster } from 'react-hot-toast';
import { GlobalProvider } from '../../context/GlobalContext';
import Header from './Header';
import { usePathname } from '../../i18n/navigation';
import Sidebar from './Sidebar';
import ConfigAos from '@/config/Aos';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Layout({ children }) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith('/auth') || pathname.startsWith("/site") || pathname == "/";
  const [sidebarOpen, setSidebarOpen] = useState(false);

	console.log(pathname);
  // Close drawer on route change + lock scroll while open (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (sidebarOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => (document.body.style.overflow = '');
  }, [sidebarOpen]);

  return (
    <GlobalProvider>
      <div className='  bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-800'>
        <div className='container !px-0 flex min-h-dvh '>
           {!isAuthRoute &&<Sidebar open={sidebarOpen} setOpen={setSidebarOpen} /> }

          {/* Main area */}
          <div className='relative flex-1 min-w-0'>
            {!isAuthRoute && <Header onMenu={() => setSidebarOpen(true)} />}

            <AnimatePresence mode='wait'>
              <motion.main key={pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
                <div className={`${!isAuthRoute && " h-[calc(100vh-65px)] overflow-auto p-6"}`}>{children}</div>
              </motion.main>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <ConfigAos />
      <Toaster position='top-center' />
    </GlobalProvider>
  );
}
