'use client';
import { Toaster } from 'react-hot-toast';
import { GlobalProvider } from '../../context/GlobalContext';
// import Header from './Header';
import { usePathname } from '../../i18n/navigation';
// import Sidebar from './Sidebar';
import ConfigAos from '@/config/Aos';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import dynamic from 'next/dynamic';
const DhikrLoading = dynamic(() => import('./DhikrLoading'), { ssr: false });
const Sidebar = dynamic(() => import('./Sidebar'), { ssr: false });
const Header = dynamic(() => import('./Header'), { ssr: false });

const LS_KEY = 'sidebar:collapsed';

export default function Layout({ children }) {
  const pathname = usePathname();

  const isAuthRoute =
    pathname.startsWith('/workouts/plans') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/form') ||
    pathname.startsWith('/thank-you') ||
    pathname.startsWith('/site') ||
    pathname === '/';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (sidebarOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => (document.body.style.overflow = '');
  }, [sidebarOpen]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw === '1') setSidebarCollapsed(true);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, sidebarCollapsed ? '1' : '0');
    } catch {}
  }, [sidebarCollapsed]);

  // if (loading) {
  //   return <DhikrLoading />;
  // }

  return (
    <GlobalProvider>
      <div className="relativebg-gradient-to-t from-indigo-50 via-white to-white text-slate-800">
        <div className="container !px-0 flex min-h-dvh">
          {!isAuthRoute && (
            <Sidebar
              open={sidebarOpen}
              setOpen={setSidebarOpen}
              collapsed={sidebarCollapsed}
              setCollapsed={setSidebarCollapsed}
            />
          )}

          {/* Main area */}
          <div className="relative flex-1 min-w-0">
            {!isAuthRoute && <Header onMenu={() => setSidebarOpen(true)} />}

            <AnimatePresence mode="wait">
              <motion.main
                key={pathname}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <div
                  className={`${
                    !isAuthRoute &&
                    '  h-[calc(100vh-65px)] overflow-auto max-md:p-3 p-4 overflow-x-hidden'
                  }`}
                >
									<div className="absolute z-[-1]  inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(rgba(79,70,229,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(79,70,229,0.12) 1px, transparent 1px)', backgroundSize: '12px 12px', backgroundPosition: '-1px -1px', }} /> 
                  {children}
                </div>
              </motion.main>
            </AnimatePresence>
          </div>
        </div>
      </div>
      {/* <PWAInstallPrompt /> */}
      <ConfigAos />
      <Toaster position="top-center" />
    </GlobalProvider>
  );
}
