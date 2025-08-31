import { motion } from 'framer-motion';

export default function TabList({ allTabs, activeTab, setActiveTab }) {
  return (
    <div role='tablist' aria-label='Categories' className='mt-4 mb-8 flex flex-wrap items-center gap-2 md:gap-2'>
      {allTabs.map(tab => {
        const isActive = activeTab === tab;
        const isHovered = activeTab === tab;

        return (
          <motion.button
            key={tab}
            role='tab'
            aria-selected={isActive}
            onClick={() => setActiveTab(tab)}
            whileHover={{ scale: 1.05 }} // Hover animation
            whileTap={{ scale: 0.98 }} // Tap animation
            className={`relative inline-flex border-slate-200/70 border bg-slate-50 items-center gap-2 rounded-full px-3 py-2 text-sm md:text-base font-semibold cursor-pointer shadow-inner transition-colors duration-300 
              ${isActive ? ' text-white' : '  hover:text-white'}`}>
            {/* Active pill animation */}
            {isHovered && <motion.span layoutId='active-pill' className='absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-lg' transition={{ type: 'spring', stiffness: 350, damping: 30 }} />}
            <span className={`relative capitalize z-10 transition-colors ${isHovered ? 'text-white drop-shadow-sm' : 'text-gray-700'}`}>{tab}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
