'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Trash, Trash2 } from 'lucide-react';

export default function FAQSection({ className , faqs, showTitle = true, removeFaq }) {
  const [openIndex, setOpenIndex] = useState(0);

  const toggleFAQ = index => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className={`w-full max-w-4xl divider px-4 ${className}`}>
      {showTitle && <h1 className='mb-12 text-4xl max-md:text-2xl font-bold text-center text-gray-900'>FAQ's</h1>}
      <div className='space-y-4'>
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <motion.div
              key={idx}
              initial={false}
              animate={{
                backgroundColor: isOpen ? '#f0fdf4' : '#ffffff',
                borderColor: isOpen ? '#22c55e' : '#e5e7eb',
                boxShadow: isOpen ? '0px 6px 20px rgba(34,197,94,0.15)' : '0px 2px 6px rgba(0,0,0,0.05)',
              }}
              transition={{ duration: 0.3 }}
              className=' cursor-pointer shadow-inner rounded-xl border overflow-hidden'>
              <button className={`cursor-pointer  duration-300 w-full flex justify-between items-center px-6 py-5 text-left text-lg font-medium transition ${isOpen ? 'text-green-600' : 'text-gray-900'}`} onClick={() => toggleFAQ(idx)}>
                <span className={`${isOpen ? 'bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent' : ''}`}>{faq.question}</span>
                <div className='flex items-center gap-2'>
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
                    <ChevronDown className={`w-6 h-6 transition ${isOpen ? 'text-green-600' : 'text-gray-500'}`} />
                  </motion.div>
                  {removeFaq && (
                    <motion.button type='button' onClick={() => removeFaq(idx)} className='text-red-500 hover:text-red-700 p-1 transition-colors'>
                      <Trash2 className='w-6 h-6 cursor-pointer ' />
                    </motion.button>
                  )}
                </div>
              </button>

              {/* Answer */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div key='content' initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: 'easeInOut' }} className='overflow-hidden'>
                    <motion.p initial={{ y: -5 }} animate={{ y: 0 }} exit={{ y: -5 }} transition={{ duration: 0.3 }} className='px-6 pb-5 text-gray-700 leading-relaxed'>
                      {faq.answer}
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
