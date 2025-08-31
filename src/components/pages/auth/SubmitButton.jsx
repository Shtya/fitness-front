import { motion } from "framer-motion";

export const SubmitButton = ({
  isLoading,
  children,
  className = "",
  ...props
}) => (
  <motion.button
    type="submit"
    disabled={isLoading} 
    className={`
      relative flex items-center justify-center cursor-pointer
      ${isLoading ? "w-fit px-4 py-4 rounded-full" : "w-full px-6 py-3 rounded-2xl"} 
      font-semibold text-white 
      bg-gradient-to-r from-emerald-500 to-emerald-400 
      shadow-sm transition-all duration-300
      hover:shadow-lg hover:from-emerald-600 hover:to-emerald-500 over:!scale-1
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500
      disabled:opacity-70 mx-auto disabled:cursor-not-allowed
      ${className}
    `}
    {...props}
  >
    {isLoading ? (
      <div className="flex items-center justify-center">
        {/* Dual-ring spinner */}
        <span className="relative flex h-6 w-6">
          <span className="absolute h-full w-full rounded-full border-4 border-white/30 border-t-white animate-spin"></span>
          <span className="absolute h-full w-full rounded-full border-4 border-transparent border-r-white animate-spin-slow"></span>
        </span>
      </div>
    ) : (
      children
    )}
  </motion.button>
);
