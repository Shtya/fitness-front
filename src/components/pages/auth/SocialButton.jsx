import Image from 'next/image';
import { motion } from 'framer-motion';

export const SocialButton = ({ icon, text, onClick, className = '' }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
    className={`group cursor-pointer relative w-full flex items-center justify-center px-4 py-3 
      rounded-2xl text-base font-semibold 
      bg-white text-gray-700 
      shadow-sm border border-gray-200 
      overflow-hidden 
      transition-all duration-300
      hover:shadow-lg hover:border-gray-300 
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500
      ${className}`}>

    <span
      className='absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-100/40 to-emerald-400/0 
        translate-x-[-150%] group-hover:translate-x-[150%] 
        transition-transform duration-700 ease-out'
    />

    {/* Icon */}
    <div className=' z-[10] absolute start-5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center'>
      <Image src={icon} alt={`${text} Icon`} width={24} height={24} className='object-contain' priority />
    </div>

    {/* Label */}
    <span className='relative z-10'>{text}</span>

    {/* Ripple Glow Background (subtle) */}
    <span
      className='absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 
        bg-gradient-to-r from-emerald-50 via-white to-emerald-50 
        transition-opacity duration-500'
    />
  </motion.button>
);
