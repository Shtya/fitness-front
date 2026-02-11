'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, LogOut, Sparkles, AlertCircle } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useRouter } from '@/i18n/navigation';
import LanguageToggle from '../atoms/LanguageToggle';
import { useTranslations } from 'next-intl';
import { useTheme } from '@/app/[locale]/theme';

function initialsFrom(name, email) {
  const src = (name && name.trim()) || (email && email.split('@')[0]) || 'G';
  const parts = src.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function fmtRole(role) {
  if (!role) return 'Guest';
  return role[0].toUpperCase() + role.slice(1);
}

export default function Header({ onMenu }) {
  const t = useTranslations('header');
  const t_myProfile = useTranslations('');
  const user = useUser?.();
  const router = useRouter();
  const { colors } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const logoutRef = useRef(null);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      router.push('/auth');
    }
  };

  useEffect(() => {
    if (!showLogoutConfirm) return;
    const handler = (e) => {
      if (logoutRef.current && !logoutRef.current.contains(e.target)) {
        setShowLogoutConfirm(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showLogoutConfirm]);

  const avatarText = initialsFrom(user?.name, user?.email);
  const isActive = (user?.status || '').toLowerCase() === 'active';

  return (
    <header className="sticky top-0 z-40 w-full"> 
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        }}
      />
      

      {/* Elegant gradient border */}
      <div
        className=" border-[.2px] absolute bottom-0 w-full h-[1px]"
        style={{
 							borderColor: 'var(--color-primary-200)',
						}}
      />

      <div className="relative px-4 sm:px-2">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* LEFT SECTION */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onMenu}
              className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200"
              style={{
                background: 'var(--color-primary-50)',
                color: 'var(--color-primary-700)',
              }}
              aria-label={t('actions.openMenu')}
            >
              <Menu className="w-4.5 h-4.5" strokeWidth={2.5} />
            </motion.button>

            {/* User Avatar */}
            <div className="relative">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative"
              >
                <div
                  className="w-9 h-9 rounded-lg grid place-items-center text-white text-xs font-black shadow-md relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
                    boxShadow: `0 2px 8px -1px var(--color-primary-400)`,
                  }}
                >
                  {avatarText}
                  
                  {/* Shine effect */}
                  <motion.div
                    className="absolute inset-0"
                    animate={{
                      background: [
                        'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                        'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                      ],
                      backgroundPosition: ['-100% -100%', '200% 200%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    style={{
                      backgroundSize: '200% 200%',
                    }}
                  />
                </div>

                {/* Status Indicator */}
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white"
                  style={{ background: isActive ? '#10b981' : '#94a3b8' }}
                >
                  {isActive && (
                    <motion.span
                      className="absolute inset-0 rounded-full"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.7, 0, 0.7],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      style={{ background: '#10b981' }}
                    />
                  )}
                </motion.span>
              </motion.div>
            </div>

            {/* User Info (Desktop) */}
            <div className="hidden sm:flex flex-col">
              <span
                className="text-sm font-bold leading-tight"
                style={{ color: 'var(--color-primary-900)' }}
              >
                {user?.name || user?.email || t('common.guest')}
              </span>
              <span
                className="text-[10px] font-semibold leading-tight uppercase tracking-wide"
                style={{ color: 'var(--color-primary-400)' }}
              >
								{t_myProfile(`myProfile.roles.${user?.role}`)}
               </span>
            </div>
          </div>

          {/* RIGHT SECTION */}
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <LanguageToggle />

            {/* Logout Button */}
            <div className="relative" ref={logoutRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowLogoutConfirm(true)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-md transition-all duration-200 relative overflow-hidden group"
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  boxShadow: '0 2px 8px -1px rgba(239, 68, 68, 0.4)',
                }}
                aria-label={t('actions.signOut')}
              >
                <LogOut className="w-4 h-4 text-white relative z-10 rtl:scale-x-[-1] " strokeWidth={2.5} />
                
                {/* Hover shine */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100"
                  animate={{
                    backgroundPosition: ['-100% -100%', '200% 200%'],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  style={{
                    background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                    backgroundSize: '200% 200%',
                  }}
                />
              </motion.button>

              {/* Logout Confirmation */}
              <AnimatePresence>
                {showLogoutConfirm && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="absolute rtl:left-0 ltr:right-0 top-[calc(100%+8px)] w-72 rounded-2xl overflow-hidden shadow-2xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.98)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <div
                          className="w-11 h-11 rounded-lg grid place-items-center text-white flex-shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                          }}
                        >
                          <AlertCircle className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 mb-1">
                            {t('logout.confirmTitle') || 'تسجيل الخروج؟'}
                          </h3>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {t('logout.confirmMessage') || 'هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowLogoutConfirm(false)}
                          className="flex-1 h-10 rounded-lg font-semibold text-sm transition-all"
                          style={{
                            border: '2px solid var(--color-primary-200)',
                            color: 'var(--color-primary-700)',
                            background: 'var(--color-primary-50)',
                          }}
                        >
                          {t('logout.cancel') || 'إلغاء'}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleLogout}
                          className="flex-1 h-10 rounded-lg font-semibold text-sm text-white"
                          style={{
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            boxShadow: '0 4px 12px -2px rgba(239, 68, 68, 0.5)',
                          }}
                        >
                          {t('logout.confirm') || 'تأكيد'}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}