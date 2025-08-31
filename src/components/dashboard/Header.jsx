'use client';

import { useState } from 'react';
import { MotionConfig, AnimatePresence, motion } from 'framer-motion';

export default function Header({ title, sidebarOpen, setSidebarOpen }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <MotionConfig reducedMotion="user">
      <header className="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center">
            {/* Burger */}
            <button
              className="text-gray-600 focus:outline-none lg:hidden relative w-10 h-10 grid place-items-center rounded-xl hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500/70"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
              aria-expanded={sidebarOpen}
            >
              <motion.span
                initial={false}
                animate={sidebarOpen ? { rotate: 45, y: 1 } : { rotate: 0, y: -5 }}
                className="block h-0.5 w-6 bg-current rounded"
              />
              <motion.span
                initial={false}
                animate={sidebarOpen ? { opacity: 0 } : { opacity: 1 }}
                className="block h-0.5 w-6 bg-current rounded mt-1.5"
              />
              <motion.span
                initial={false}
                animate={sidebarOpen ? { rotate: -45, y: -1 } : { rotate: 0, y: 5 }}
                className="block h-0.5 w-6 bg-current rounded mt-1.5"
              />
            </button>

            <motion.h1
              className="ml-1 sm:ml-3 text-xl sm:text-2xl font-semibold text-gray-800"
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              {title}
            </motion.h1>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500/70"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <motion.img
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className="w-8 h-8 rounded-full ring-2 ring-white shadow-sm"
                src="https://via.placeholder.com/64"
                alt="User avatar"
              />
              <span className="hidden sm:block text-gray-700 text-sm">Admin</span>
              <motion.svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                xmlns="http://www.w3.org/2000/svg"
                animate={{ rotate: menuOpen ? 180 : 0 }}
                className="text-gray-600"
              >
                <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </motion.svg>
            </button>

            <AnimatePresence>
              {menuOpen && (
                <>
                  <motion.div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  />
                  <motion.ul
                    role="menu"
                    className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
                    initial={{ y: -8, opacity: 0, scale: 0.98 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -8, opacity: 0, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                  >
                    {['Profile', 'Settings', 'Sign out'].map((label) => (
                      <motion.li
                        key={label}
                        whileHover={{ x: 4 }}
                        className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                      >
                        {label}
                      </motion.li>
                    ))}
                  </motion.ul>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>
    </MotionConfig>
  );
}
