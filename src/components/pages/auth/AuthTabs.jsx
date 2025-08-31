'use client';
import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutGroup, motion } from 'framer-motion';

const TABS = [
  { key: 'login', label: 'Sign In' },
  { key: 'register', label: 'Sign Up' },
  { key: 'forgot-password', label: 'Forgot?' },
];

export default function AuthTabs({setView}) {
  const router = useRouter();
  // optional: read initial tab from URL (?tab=register)
  const search = typeof useSearchParams === 'function' ? useSearchParams() : null;
  const initialFromUrl = search?.get('tab') || 'login';

  const [activeTab, setActiveTab] = useState(initialFromUrl);
  const [hoveredTab, setHoveredTab] = useState(null);

  const pillTarget = hoveredTab ?? activeTab;

  const handleClick = key => {
    setActiveTab(key);
    router.push(`/auth?tab=${key}`);
	if(key == "login" || key === 'register')  setView("options")
	if(key == "forgot-password") setView("email")
  };

  return (
    <LayoutGroup id='auth-tabs'>
      <div role='tablist' aria-label='Authentication' className='mb-10 grid grid-cols-3 gap-2 rounded-2xl bg-gray-100/80 pb-[3px] p-1 text-sm font-medium ring-1 ring-black/5 shadow-sm backdrop-blur'>
        {TABS.map(t => {
          const isPreviewed = pillTarget === t.key; // hovered OR active
          const isActive = activeTab === t.key;

          return (
            <motion.button
              key={t.key}
              role='tab'
              aria-selected={isActive}
              aria-controls={`panel-${t.key}`}
              id={`tab-${t.key}`}
              onClick={() => handleClick(t.key)}
              onMouseEnter={() => setHoveredTab(t.key)}
              onMouseLeave={() => setHoveredTab(null)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              className=' cursor-pointer relative select-none rounded-xl px-3 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/60'>
               {isPreviewed && <motion.span layoutId='active-pill' className='absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-lg' transition={{ type: 'spring', stiffness: 350, damping: 30 }} />}

              <span className={`relative z-10 transition-colors ${isPreviewed ? 'text-white drop-shadow-sm' : 'text-gray-700'}`}>{t.label}</span>
            </motion.button>
          );
        })}
      </div>

    </LayoutGroup>
  );
}
