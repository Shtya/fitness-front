"use client";

import { useState } from 'react';
import { MotionConfig, AnimatePresence, motion } from 'framer-motion';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';

export default function DashboardLayout({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-screen bg-gray-100">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            title={title}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />

          {/* Page transition */}
          <div className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 sm:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={typeof window !== 'undefined' ? window.location.pathname : 'page'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.6 }}
                className="min-h-[calc(100vh-6rem)]"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
