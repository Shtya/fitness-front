"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette,
  Sparkles,
  Check,
  ChevronRight,
  Droplet,
  Sun,
  Moon,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme, COLOR_PALETTES } from "@/app/[locale]/theme";

// ============================================================================
// THEME SELECTOR CARD
// ============================================================================

function ThemeSelectorCard({ themeKey, palette, isActive, onClick, index }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative group w-full text-left focus:outline-none"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Main Card */}
      <div
        className={`relative overflow-hidden rounded-2xl transition-all duration-500 ${
          isActive ? "shadow-2xl scale-105" : "shadow-lg hover:shadow-xl"
        }`}
        style={{
          background: `linear-gradient(135deg, ${palette.gradient.from}, ${palette.gradient.via}, ${palette.gradient.to})`,
        }}
      >
        {/* Shimmer Effect */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
            backgroundSize: "200% 100%",
          }}
          animate={
            isHovered
              ? { backgroundPosition: ["-200% 0", "200% 0"] }
              : { backgroundPosition: "-200% 0" }
          }
          transition={{ duration: 1.5, ease: "linear" }}
        />

        {/* Content */}
        <div className="relative p-6">
          {/* Active Checkmark */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                className="absolute top-4 ltr:right-4 rtl:left-4 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg"
              >
                <Check className="w-5 h-5" style={{ color: palette.primary[600] }} strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Theme Name */}
          <h3 className="text-2xl font-black text-white mb-4 drop-shadow-lg">
            {palette.name}
          </h3>

          {/* Color Dots */}
          <div className="flex items-center gap-2">
            {[
              palette.primary[500],
              palette.secondary[500],
              palette.primary[300],
              palette.secondary[300],
              palette.primary[700],
            ].map((color, idx) => (
              <motion.div
                key={idx}
                className="w-3 h-3 rounded-full bg-white shadow-md"
                style={{
                  backgroundColor: "white",
                  boxShadow: `0 0 0 3px ${color}`,
                }}
                whileHover={{ scale: 1.5 }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.05 + idx * 0.05 }}
              />
            ))}
          </div>

          {/* Hover Arrow */}
          <motion.div
            className="absolute bottom-4 ltr:right-4 rtl:left-4 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
            initial={{ opacity: 0, x: -10 }}
            animate={{
              opacity: isHovered || isActive ? 1 : 0,
              x: isHovered || isActive ? 0 : -10,
            }}
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </motion.div>
        </div>

        {/* Gradient Overlay on Hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/10 to-white/0"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Glow Effect */}
      <motion.div
        className="absolute -inset-1 rounded-2xl blur-xl -z-10"
        style={{
          background: `linear-gradient(135deg, ${palette.gradient.from}, ${palette.gradient.to})`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isActive ? 0.6 : isHovered ? 0.4 : 0 }}
        transition={{ duration: 0.3 }}
      />
    </motion.button>
  );
}

// ============================================================================
// INTERACTIVE PREVIEW
// ============================================================================

function InteractivePreview({ currentPalette }) {
  const t = useTranslations("home.theme.themeShowcase");
  const [activeElement, setActiveElement] = useState(null);

  const demoElements = [
    {
      id: "button",
      icon: Zap,
      label: t("preview.button"),
      description: t("preview.buttonDesc"),
    },
    {
      id: "card",
      icon: Droplet,
      label: t("preview.card"),
      description: t("preview.cardDesc"),
    },
    {
      id: "badge",
      icon: Sparkles,
      label: t("preview.badge"),
      description: t("preview.badgeDesc"),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
          style={{
            backgroundColor: `${currentPalette.primary[500]}15`,
            border: `2px solid ${currentPalette.primary[500]}30`,
          }}
        >
          <Palette className="w-4 h-4" style={{ color: currentPalette.primary[600] }} />
          <span className="text-sm font-bold" style={{ color: currentPalette.primary[700] }}>
            {t("preview.title")}
          </span>
        </div>
        <h3 className="text-3xl font-black mb-2" style={{ color: currentPalette.primary[900] }}>
          {t("preview.heading")}
        </h3>
        <p className="text-white">{t("preview.subheading")}</p>
      </motion.div>

      {/* Interactive Elements Grid */}
      <div className="grid grid-cols-1 gap-4">
        {demoElements.map((element, idx) => {
          const Icon = element.icon;
          const isActive = activeElement === element.id;

          return (
            <motion.button
              key={element.id}
              onClick={() =>
                setActiveElement(isActive ? null : element.id)
              }
              className=" bg-slate-800 relative text-left p-6 rounded-2xl border-2 transition-all duration-300 group"
              style={{
                borderColor: isActive
                  ? currentPalette.primary[500]
                  : `${currentPalette.primary[500]}20`,
                backgroundColor: isActive
                  ? `${currentPalette.primary[500]}10`
                  : ``
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <motion.div
                  className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${currentPalette.gradient.from}, ${currentPalette.gradient.to})`,
                  }}
                  animate={
                    isActive
                      ? {
                          rotate: [0, -5, 5, -5, 0],
                          scale: [1, 1.1, 1],
                        }
                      : {}
                  }
                  transition={{ duration: 0.5 }}
                >
                  <Icon className="w-7 h-7 text-white" />
                </motion.div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4
                      className="text-lg font-black"
                      style={{
                        color: isActive
                          ? currentPalette.primary[700]
                          : currentPalette.primary[900],
                      }}
                    >
                      {element.label}
                    </h4>
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: currentPalette.primary[500],
                          }}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                  <p className="text-sm text-white">
                    {element.description}
                  </p>

                  {/* Demo Component */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        {element.id === "button" && (
                          <motion.button
                            className="px-6 py-3 rounded-xl font-bold text-white shadow-lg"
                            style={{
                              background: `linear-gradient(135deg, ${currentPalette.gradient.from}, ${currentPalette.gradient.to})`,
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {t("preview.sampleButton")}
                          </motion.button>
                        )}

                        {element.id === "card" && (
                          <div
                            className="p-4 rounded-xl border-2"
                            style={{
                              borderColor: `${currentPalette.primary[500]}30`,
                              background: `linear-gradient(135deg, ${currentPalette.primary[50]}, white)`,
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-lg"
                                style={{
                                  backgroundColor: currentPalette.primary[500],
                                }}
                              />
                              <div className="flex-1">
                                <div
                                  className="h-3 rounded mb-2"
                                  style={{
                                    backgroundColor: currentPalette.primary[200],
                                    width: "60%",
                                  }}
                                />
                                <div
                                  className="h-2 rounded"
                                  style={{
                                    backgroundColor: currentPalette.primary[100],
                                    width: "40%",
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {element.id === "badge" && (
                          <div className="flex gap-2 flex-wrap">
                            {["Premium", "New", "Featured"].map((badge) => (
                              <span
                                key={badge}
                                className="px-3 py-1.5 rounded-full text-sm font-bold"
                                style={{
                                  backgroundColor: currentPalette.primary[100],
                                  color: currentPalette.primary[700],
                                }}
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Arrow Indicator */}
                <motion.div
                  animate={{ rotate: isActive ? 90 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronRight
                    className=" rtl:scale-x-[-1] w-5 h-5"
                    style={{
                      color: isActive
                        ? currentPalette.primary[500]
                        : currentPalette.primary[300],
                    }}
                  />
                </motion.div>
              </div>
            </motion.button>
          );
        })}
      </div>
 
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ThemeShowcaseSection() {
  const t = useTranslations("home.theme.themeShowcase");
  const { theme: currentTheme, setTheme, colors } = useTheme();

  const themeEntries = useMemo(() => Object.entries(COLOR_PALETTES), []);
  const currentPalette = colors;

  return (
    <section className="relative py-16 sm:py-20 md:py-24 lg:py-28 overflow-hidden ">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div
          className="absolute top-0 ltr:left-0 rtl:right-0 w-96 h-96 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${currentPalette.primary[300]}, transparent)`,
          }}
        />
        <div
          className="absolute bottom-0 ltr:right-0 rtl:left-0 w-96 h-96 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${currentPalette.secondary[300]}, transparent)`,
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full shadow-lg mb-6"
            style={{
              background: `linear-gradient(135deg, ${currentPalette.primary[500]}, ${currentPalette.secondary[500]})`,
            }}
            animate={{
              y: [0, -5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Sparkles className="w-5 h-5 text-white" />
            <span className="text-sm font-bold text-white uppercase tracking-wider">
              {t("badge")}
            </span>
          </motion.div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6">
            <span
              style={{
                color: currentPalette.gradient.from,
                // WebkitBackgroundClip: "text",
                // backgroundClip: "text",
                // WebkitTextFillColor: "transparent",
              }}
            >
              {t("title")}
            </span>
          </h2>

          <p className="text-lg sm:text-xl text-white max-w-2xl mx-auto">
            {t("description")}
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-7xl mx-auto">
          {/* Left: Theme Selector */}
          <div> 
 
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {themeEntries.map(([key, palette], index) => (
                <ThemeSelectorCard
                  key={key}
                  themeKey={key}
                  palette={palette}
                  isActive={currentTheme === key}
                  onClick={() => setTheme(key)}
                  index={index}
                />
              ))}
            </div>
          </div>

          {/* Right: Interactive Preview */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <InteractivePreview currentPalette={currentPalette} />
          </div>
        </div>
      </div>
    </section>
  );
}