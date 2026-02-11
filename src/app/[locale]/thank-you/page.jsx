// app/thank-you/page-alternative.jsx
"use client";

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/app/[locale]/theme";
import { useEffect, useState } from "react";

export default function ThankYouPageAlternative() {
  const t = useTranslations("ThankYouPage");
  const { colors } = useTheme();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);
  if (!isClient) return null;

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-6 py-20 overflow-hidden"
      style={{ background: colors.primary[900] }}
    >
      {/* Diagonal stripes background */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="stripes"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="30" height="60" fill={colors.primary[100]} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#stripes)" />
        </svg>
      </div>

      {/* Radial gradient overlay */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(circle at 30% 50%, ${colors.primary[700]}, transparent 70%),
                      radial-gradient(circle at 70% 50%, ${colors.secondary[800]}, transparent 70%)`,
        }}
      />

      <div className="relative w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="grid lg:grid-cols-2 gap-12 items-center"
        >
          {/* Left side */}
          <div className="order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              {/* Overline */}
              <motion.div
                className="inline-flex items-center gap-3 mb-8 px-6 py-3 rounded-full backdrop-blur-sm"
                style={{
                  background: `${colors.primary[100]}20`,
                  border: `1px solid ${colors.primary[300]}40`,
                }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: colors.secondary[400] }}
                />
                <span
                  className="text-sm font-bold tracking-widest uppercase"
                  style={{ color: colors.primary[100] }}
                >
                  {t("overline")}
                </span>
              </motion.div>

              {/* Main heading */}
              <motion.h1
                className="text-7xl sm:text-8xl lg:text-9xl font-black leading-none mb-6 tracking-tighter"
                style={{
                  color: colors.primary[50],
                  textShadow: `4px 4px 0 ${colors.primary[700]}`,
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                {t("title")}
              </motion.h1>

              {/* Accent line */}
              <motion.div
                className="w-24 h-2 rounded-full mb-8"
                style={{
                  background: `linear-gradient(90deg, ${colors.secondary[400]}, ${colors.primary[400]})`,
                  transformOrigin: "left",
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.9, duration: 0.6 }}
              />

              {/* Description */}
              <motion.p
                className="text-xl sm:text-2xl font-medium leading-relaxed mb-10"
                style={{ color: colors.primary[200] }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.8 }}
              >
                {t("description")}
              </motion.p>
 
            </motion.div>
          </div>

          {/* Right side */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.4, duration: 1, type: "spring", stiffness: 100 }}
            >
              <div className="relative w-80 h-80 sm:w-96 sm:h-96">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: `8px solid ${colors.primary[400]}`,
                    borderTopColor: colors.secondary[400],
                    borderRightColor: colors.secondary[400],
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />

                <motion.div
                  className="absolute inset-8 rounded-full"
                  style={{
                    border: `4px solid ${colors.primary[600]}`,
                    borderBottomColor: colors.secondary[600],
                    borderLeftColor: colors.secondary[600],
                  }}
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                />

                <motion.div
                  className="absolute inset-16 rounded-full flex items-center justify-center backdrop-blur-xl"
                  style={{
                    background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.to})`,
                    boxShadow: `0 0 80px ${colors.primary[500]}60, inset 0 0 60px ${colors.primary[900]}40`,
                  }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Check className="w-32 h-32 text-white" strokeWidth={4} />
                </motion.div>

                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-4 h-4 rounded-full"
                    style={{
                      background: i % 2 === 0 ? colors.secondary[400] : colors.primary[400],
                      left: "50%",
                      top: "50%",
                      marginLeft: "-8px",
                      marginTop: "-8px",
                    }}
                    animate={{
                      x: [0, Math.cos((i * Math.PI * 2) / 8) * 150, 0],
                      y: [0, Math.sin((i * Math.PI * 2) / 8) * 150, 0],
                      scale: [1, 1.5, 1],
                      opacity: [0.8, 1, 0.8],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      delay: (i * 4) / 8,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Bottom decorative element */}
        <motion.div
          className="mt-4 flex justify-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <div className="flex items-center gap-4">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="rounded-full"
                style={{
                  width: `${12 + i * 4}px`,
                  height: `${12 + i * 4}px`,
                  background:
                    i === 2
                      ? `linear-gradient(135deg, ${colors.secondary[400]}, ${colors.primary[400]})`
                      : colors.primary[700],
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.5 + i * 0.1, type: "spring", stiffness: 200 }}
              />
            ))}
            <Sparkles className="w-8 h-8 ml-2" style={{ color: colors.secondary[400] }} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
