'use client';
import { Toaster } from 'react-hot-toast';
import { GlobalProvider } from '../../context/GlobalContext';
import { usePathname } from '../../i18n/navigation';
import ConfigAos from '@/config/Aos';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useUser } from '@/hooks/useUser';
import { useTranslations } from 'next-intl';
import Providers from '@/context/ReactQuery';
import Link from 'next/link';
import { ThemeProvider } from '@/app/[locale]/theme';
import { useInitialRoleRedirect } from '@/hooks/useInitialRoleRedirect';

const Sidebar = dynamic(() => import('./Sidebar'), { ssr: false });
const Header = dynamic(() => import('./Header'), { ssr: false });

const LS_KEY = 'sidebar:collapsed';

export default function Layout({ children }) {
  const pathname = usePathname();
	useInitialRoleRedirect();
  const t = useTranslations('mobile');
  const [role, setRole] = useState('user');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 1168);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const user = useUser();
  useEffect(() => {
    if (user) {
      try {
        setRole(user?.role);
      } catch {}
    }
  }, [user]);

  const isAdminOrCoach = role === 'admin' || role === 'coach';
  const isFormRoute = pathname.startsWith('/auth') || pathname.includes('/dashboard/builder/preview');
  const blockFormOnMobile = !isFormRoute && isMobile && isAdminOrCoach;

  const isAuthRoute =
    pathname.includes('dashboard/templates') ||
    pathname.startsWith('/workouts/plans') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/form') ||
    pathname.startsWith('/thank-you') ||
    pathname.startsWith('/site') ||
    pathname === '/';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (sidebarOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => (document.body.style.overflow = '');
  }, [sidebarOpen]);

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

  if (blockFormOnMobile) {
    return (
      <GlobalProvider>
        <ThemeProvider>
          <motion.div
            className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50" />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, var(--color-primary-400) 1px, transparent 0)`,
                backgroundSize: '40px 40px',
              }}
            />

            <div className="max-w-md w-full rounded-3xl border-2 p-8 shadow-2xl bg-white/80 backdrop-blur-xl relative z-10"
              style={{ borderColor: 'var(--color-primary-200)' }}
            >
              <div className="text-center">
                <div
                  className="w-20 h-20 mx-auto mb-6 rounded-2xl grid place-items-center text-white shadow-xl"
                  style={{
                    background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
                  }}
                >
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>

                <h1 className="text-2xl font-black mb-3" style={{ color: 'var(--color-primary-900)' }}>
                  {t('desktop_required_title')}
                </h1>
                <p className="text-slate-600 mb-6 text-sm leading-relaxed">{t('desktop_required_message')}</p>

                <Link
                  className="inline-flex items-center justify-center h-12 px-6 rounded-xl font-bold text-white shadow-lg transition-all hover:shadow-xl"
                  href={'/auth'}
                  style={{
                    background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
                  }}
                >
                  {t('reload_button')}
                </Link>
              </div>
            </div>
          </motion.div>
          <ConfigAos />
          <Toaster position="top-center" />
        </ThemeProvider>
      </GlobalProvider>
    );
  }

  return (
    <GlobalProvider>
      <Providers>
        <ThemeProvider>
          <div className="relative min-h-screen">
            {/* Premium background */}
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-slate-50" />
            
            {/* Subtle dot pattern */}
            <div
              className="fixed inset-0 -z-10 opacity-[0.015]"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, var(--color-primary-500) 1px, transparent 0)`,
                backgroundSize: '32px 32px',
              }}
            />

            {/* Gradient orbs */}
            <div
              className="fixed top-0 right-0 w-[600px] h-[600px] -z-10 opacity-20 blur-3xl"
              style={{
                background: `radial-gradient(circle, var(--color-primary-200), transparent 70%)`,
              }}
            />
            <div
              className="fixed bottom-0 left-0 w-[600px] h-[600px] -z-10 opacity-20 blur-3xl"
              style={{
                background: `radial-gradient(circle, var(--color-secondary-200), transparent 70%)`,
              }}
            />

            <div className="flex min-h-screen">
              {!isAuthRoute && (
                <Sidebar
                  open={sidebarOpen}
                  setOpen={setSidebarOpen}
                  collapsed={sidebarCollapsed}
                  setCollapsed={setSidebarCollapsed}
                />
              )}

              <div className="relative flex-1 min-w-0">
                {!isAuthRoute && <Header onMenu={() => setSidebarOpen(true)} />}

                <AnimatePresence mode="wait">
                  <motion.main
                    key={pathname}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div
                      id="body"
                      className={`${
                        !isAuthRoute && 'h-[calc(100vh-64px)] overflow-auto p-4 md:p-6'
                      }`}
                    >
                      {children}
                    </div>
                  </motion.main>
                </AnimatePresence>
              </div>
            </div>
          </div>

          <ConfigAos />
          <Toaster position="top-center" />
        </ThemeProvider>
      </Providers>
    </GlobalProvider>
  );
}