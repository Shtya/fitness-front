import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import Button from '../atoms/Button';

export function Popup({ isOpen, onClose, children, title }) {
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : 'auto';
        return () => (document.body.style.overflow = 'auto');
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className=' fixed w-full h-full  inset-0 flex items-center justify-center z-[100000000000]'>
                    <motion.div className='fixed w-full h-full  inset-0 bg-black/60 backdrop-blur-[5px]  ' onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />

                    <motion.div
                        className=' bg-white rounded-2xl p-6 z-50 shadow-2xl w-[90%] max-w-md'
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}>
                        <div className='flex justify-between items-center mb-4'>
                            <h3 className='text-lg text-black font-semibold'>{title}</h3>
                            <Button cn=" !p-[1px] " innerCn={"!gap-0 !justify-center !items-center !flex !w-[35px] !h-[35px] !px-[5px] "}  onclick={onClose} icon={<X className='w-5 h-5 text-gray-600' />} />
                        </div>
                        <div>{children}</div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
