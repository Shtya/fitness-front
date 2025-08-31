"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";

export default function FavoriteButton({className}) {
  const [active, setActive] = useState(false);
   return (
    <motion.button
		whileHover={{ rotate: 6 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      whileTap={{ scale: 0.85 }}
      onClick={() => setActive(!active)}
      className={`${className} border border-slate-200 cursor-pointer absolute z-[10] top-3 right-3 h-9 w-9 flex items-center justify-center rounded-lg bg-white shadow-md hover:shadow-lg transition`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {active ? (
          <motion.div
            key="filled"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 900, damping: 50 }}
          >
            <Heart className="w-5 h-5 text-green-600 fill-green-600" />
          </motion.div>
        ) : (
          <motion.div
            key="outline"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 900, damping: 50 }}
          >
            <Heart className="w-5 h-5 text-slate-500" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
