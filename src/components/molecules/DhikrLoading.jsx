import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: 'easeOut', when: 'beforeChildren', staggerChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.1, ease: 'easeOut' } },
};

const DhikrLoading = () => {
  return (
    <div className='w-full min-h-screen bg-[#e8efff] relative overflow-hidden'>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_70%_20%,rgba(19,41,104,0.18),transparent_60%)] bg-no-repeat' />

      <motion.div className='relative z-10 flex h-svh max-w-xl flex-col mx-auto items-center justify-center gap-8 px-6 py-10' initial='hidden' animate='visible' variants={container} aria-live='polite'>
        <motion.div className='max-w-4xl text-center' dir='rtl' variants={item}>
          <h1 className='text-3xl sm:text-4xl font-bold leading-tight text-slate-900'>
            <span className='block duah-font drop-shadow-sm'>اذكر الله</span>
            <span className='mx-auto mt-3 block h-[3px] w-24 rounded-full  bg-gradient-to-r from-[#0e2043]/80 to-[#0e2043]/30 blur-[0.2px]' />
            <span className='block quran-font text-lg sm:text-xl font-normal text-slate-700 mt-3 leading-relaxed'>فَقُلْتُ اسْتَغْفِرُوا رَبَّكُمْ إِنَّهُ كَانَ غَفَّارًا • يُرْسِلِ السَّمَاءَ عَلَيْكُم مِّدْرَارًا • وَيُمْدِدْكُم بِأَمْوَالٍ وَبَنِينَ • وَيَجْعَل لَّكُمْ جَنَّاتٍ • وَيَجْعَل لَّكُمْ أَنْهَارًا</span>
          </h1>
        </motion.div>

        <motion.div role='status' aria-label='جارٍ التحميل' className='relative' variants={item}>
          <motion.div className='h-16 w-16 rounded-full border-[10px] border-[#0e2043] border-t-transparent' animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }} />
          <div className='absolute inset-0 rounded-full blur-md bg-[#0e2043]/15' />

          <motion.span className='absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-[#0e2043]' animate={{ rotate: 360 }} style={{ transformOrigin: '50% 200%' }} transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }} />
        </motion.div>
        <motion.p className='text-sm text-slate-600 quran-font' variants={item}>
          (نوح ١٠–١٢)
        </motion.p>
      </motion.div>
    </div>
  );
};

export default DhikrLoading;
