"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Sparkles, Check, ChevronRight, Droplet, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme, COLOR_PALETTES } from "@/app/[locale]/theme";

// ─── NOTE ON INLINE STYLES ────────────────────────────────────────────────────
// The palette.gradient.from/via/to, palette.primary[N], palette.secondary[N]
// are runtime JS values from COLOR_PALETTES — they cannot be Tailwind classes.
// We keep inline style= ONLY for those dynamic palette values.
// Everything structural (layout, spacing, shadows, typography) is Tailwind.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Theme Selector Card ──────────────────────────────────────────────────────
function ThemeSelectorCard({ themeKey, palette, isActive, onClick, index }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.45 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Glow ring — behind card */}
      <motion.div
        className="absolute -inset-[2px] rounded-2xl blur-lg -z-10"
        style={{ background: `linear-gradient(135deg, ${palette.gradient.from}, ${palette.gradient.to})` }}
        animate={{ opacity: isActive ? 0.55 : hovered ? 0.3 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Card */}
      <div className={[
        "relative overflow-hidden rounded-2xl border-2 transition-all duration-300",
        "bg-slate-900/90 backdrop-blur-sm",
        isActive
          ? "border-white/30 shadow-2xl scale-[1.02]"
          : "border-white/[0.07] hover:border-white/20 shadow-lg",
      ].join(" ")}>

        {/* ── Gradient swatch — top portion ── */}
        <div
          className="relative h-24 w-full overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${palette.gradient.from}, ${palette.gradient.via}, ${palette.gradient.to})` }}
        >
          {/* Noise grain overlay */}
          <div className="absolute inset-0 opacity-[0.08]
            bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.75%22 numOctaves=%223%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')]" />

          {/* Shimmer sweep */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
            }}
            animate={hovered ? { backgroundPosition: ["-200% 0", "200% 0"] } : { backgroundPosition: "-200% 0" }}
            transition={{ duration: 1.4, ease: "linear" }}
          />

          {/* Active check badge */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                className="absolute top-3 ltr:right-3 rtl:left-3 w-7 h-7 bg-white rounded-full
                  flex items-center justify-center shadow-lg"
              >
                <Check
                  className="w-4 h-4" strokeWidth={3}
                  style={{ color: palette.primary[600] }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Palette name — overlaid bottom of swatch */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-6
            bg-gradient-to-t from-black/50 to-transparent">
            <h3 className="font-display text-lg text-white leading-tight drop-shadow-md">
              {palette.name}
            </h3>
          </div>
        </div>

        {/* ── Bottom info strip ── */}
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Color dots */}
          <div className="flex items-center gap-1.5">
            {[
              palette.primary[700],
              palette.primary[500],
              palette.primary[300],
              palette.secondary[500],
              palette.secondary[300],
            ].map((color, idx) => (
              <motion.div
                key={idx}
                className="w-4 h-4 rounded-full border-2 border-slate-900/60"
                style={{ backgroundColor: color }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.06 + idx * 0.04 }}
                whileHover={{ scale: 1.5, zIndex: 10 }}
              />
            ))}
          </div>

          {/* Arrow */}
          <motion.div
            className="w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center"
            animate={{ opacity: hovered || isActive ? 1 : 0.4, x: hovered ? 2 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-4 h-4 text-white/70 rtl:scale-x-[-1]" />
          </motion.div>
        </div>
      </div>
    </motion.button>
  );
}

// ─── Live Preview Canvas ──────────────────────────────────────────────────────
// Renders a dark-bg "canvas" with the current palette applied as accent
function InteractivePreview({ currentPalette }) {
  const t = useTranslations("home.theme.themeShowcase");
  const [activeEl, setActiveEl] = useState(null);

  const demoElements = [
    { id: "button", icon: Zap,     label: t("preview.button"), desc: t("preview.buttonDesc") },
    { id: "card",   icon: Droplet, label: t("preview.card"),   desc: t("preview.cardDesc") },
    { id: "badge",  icon: Sparkles,label: t("preview.badge"),  desc: t("preview.badgeDesc") },
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* Preview header */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/[0.07]">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${currentPalette.gradient.from}, ${currentPalette.gradient.to})` }}
        >
          <Palette className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-body text-sm font-bold text-white leading-tight">
            {t("preview.title")}
          </p>
          <p className="font-body text-[11px] text-white/40">
            {t("preview.subheading")}
          </p>
        </div>
      </div>

      {/* Interactive element rows */}
      <div className="flex flex-col gap-3">
        {demoElements.map((el, idx) => {
          const Icon     = el.icon;
          const isActive = activeEl === el.id;

          return (
            <motion.button
              key={el.id}
              onClick={() => setActiveEl(isActive ? null : el.id)}
              className={[
                "relative text-left w-full rounded-xl border transition-all duration-200",
                "bg-slate-800/60 backdrop-blur-sm overflow-hidden",
                isActive ? "border-white/20" : "border-white/[0.06] hover:border-white/12",
              ].join(" ")}
              style={isActive ? {
                boxShadow: `0 0 0 1px ${currentPalette.primary[500]}40, inset 0 0 20px ${currentPalette.primary[500]}08`
              } : {}}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileTap={{ scale: 0.99 }}
            >
              {/* Active accent bar */}
              {isActive && (
                <motion.div
                  layoutId="preview-accent"
                  className="absolute top-0 left-0 bottom-0 w-[3px] rounded-l-xl"
                  style={{ background: `linear-gradient(180deg, ${currentPalette.gradient.from}, ${currentPalette.gradient.to})` }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              <div className="flex items-start gap-3 p-4">
                {/* Icon */}
                <motion.div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg shrink-0"
                  style={{ background: `linear-gradient(135deg, ${currentPalette.gradient.from}, ${currentPalette.gradient.to})` }}
                  animate={isActive ? { rotate: [0, -6, 6, -4, 0], scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </motion.div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-body text-sm font-bold text-white">{el.label}</h4>
                    {isActive && (
                      <motion.span
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: currentPalette.primary[400] }}
                      />
                    )}
                  </div>
                  <p className="font-body text-[12px] text-white/40 leading-snug">{el.desc}</p>

                  {/* ── Demo component — revealed on click ── */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.28 }}
                        className="overflow-hidden"
                      >
                        {/* Demo canvas */}
                        <div className="rounded-xl bg-slate-950/60 border border-white/[0.06] p-4">
                          {el.id === "button" && (
                            <div className="flex flex-wrap gap-3 items-center">
                              {/* Primary button */}
                              <motion.button
                                className="px-5 py-2.5 rounded-xl font-body font-bold text-sm text-white shadow-lg"
                                style={{ background: `linear-gradient(135deg, ${currentPalette.gradient.from}, ${currentPalette.gradient.to})` }}
                                whileHover={{ scale: 1.04, y: -1 }}
                                whileTap={{ scale: 0.97 }}
                              >
                                {t("preview.sampleButton")}
                              </motion.button>
                              {/* Ghost button */}
                              <motion.button
                                className="px-5 py-2.5 rounded-xl font-body font-semibold text-sm border"
                                style={{
                                  borderColor: `${currentPalette.primary[500]}50`,
                                  color: currentPalette.primary[400],
                                  background: `${currentPalette.primary[500]}10`,
                                }}
                                whileHover={{ scale: 1.04, y: -1 }}
                                whileTap={{ scale: 0.97 }}
                              >
                                {t("preview.sampleButton")}
                              </motion.button>
                            </div>
                          )}

                          {el.id === "card" && (
                            <div
                              className="rounded-xl p-4 border"
                              style={{
                                borderColor: `${currentPalette.primary[500]}25`,
                                background: `linear-gradient(135deg, ${currentPalette.primary[500]}10, ${currentPalette.secondary[500]}08)`,
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-lg shrink-0"
                                  style={{ background: `linear-gradient(135deg, ${currentPalette.gradient.from}, ${currentPalette.gradient.to})` }}
                                />
                                <div className="flex-1 space-y-2">
                                  <div className="h-2.5 rounded-full w-3/5"
                                    style={{ backgroundColor: `${currentPalette.primary[500]}40` }} />
                                  <div className="h-2 rounded-full w-2/5"
                                    style={{ backgroundColor: `${currentPalette.primary[500]}25` }} />
                                </div>
                              </div>
                            </div>
                          )}

                          {el.id === "badge" && (
                            <div className="flex flex-wrap gap-2">
                              {["Premium", "New", "Featured"].map((badge, bi) => (
                                <motion.span
                                  key={badge}
                                  className="font-body px-3 py-1 rounded-full text-xs font-bold"
                                  style={{
                                    background: `${currentPalette.primary[500]}${["22","18","14"][bi]}`,
                                    color: currentPalette.primary[400],
                                    border: `1px solid ${currentPalette.primary[500]}30`,
                                  }}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: bi * 0.07 }}
                                >
                                  {badge}
                                </motion.span>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Chevron */}
                <motion.div
                  animate={{ rotate: isActive ? 90 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="shrink-0 mt-0.5"
                >
                  <ChevronRight
                    className="w-4 h-4 rtl:scale-x-[-1]"
                    style={{ color: isActive ? currentPalette.primary[400] : "rgba(255,255,255,0.25)" }}
                  />
                </motion.div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Palette colour scale strip */}
      <div className="mt-1">
        <p className="font-body text-[10px] font-bold uppercase tracking-[0.14em] text-white/30 mb-2">
          {t("preview.title")} · Scale
        </p>
        <div className="flex rounded-xl overflow-hidden h-7">
          {[900,800,700,600,500,400,300,200,100].map((shade) => (
            <motion.div
              key={shade}
              className="flex-1 transition-transform duration-200 hover:scale-y-110 hover:z-10"
              style={{ backgroundColor: currentPalette.primary[shade] }}
              title={`primary-${shade}`}
            />
          ))}
        </div>
        <div className="flex rounded-xl overflow-hidden h-7 mt-1.5">
          {[900,800,700,600,500,400,300,200,100].map((shade) => (
            <motion.div
              key={shade}
              className="flex-1 transition-transform duration-200 hover:scale-y-110 hover:z-10"
              style={{ backgroundColor: currentPalette.secondary[shade] }}
              title={`secondary-${shade}`}
            />
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────
export default function ThemeShowcaseSection() {
  const t = useTranslations("home.theme.themeShowcase");
  const { theme: currentTheme, setTheme, colors } = useTheme();
  const themeEntries = useMemo(() => Object.entries(COLOR_PALETTES), []);
  const currentPalette = colors;

  return (
    <section className="relative py-16 sm:py-20 md:py-24 lg:py-28 ">

      {/* ── Background orbs ── */}
      <div className="absolute inset-0  pointer-events-none">
        <motion.div
          className="absolute -top-20 ltr:-left-20 rtl:-right-20 w-[500px] h-[500px]
            rounded-full blur-[100px] opacity-[0.12]"
          style={{ background: `radial-gradient(circle, ${currentPalette.primary[400]}, transparent)` }}
          animate={{ scale: [1,1.15,1], opacity:[0.1,0.18,0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-20 ltr:-right-20 rtl:-left-20 w-[500px] h-[500px]
            rounded-full blur-[100px] opacity-[0.12]"
          style={{ background: `radial-gradient(circle, ${currentPalette.secondary[400]}, transparent)` }}
          animate={{ scale: [1,1.2,1], opacity:[0.1,0.16,0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        /> 
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-16">

        {/* ── Section header ── */}
        <motion.div
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: -24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge — uses CSS var so current theme animates it */}
          <motion.div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full
              border border-[var(--color-primary-500)]/30
              bg-[var(--color-primary-500)]/[0.08] backdrop-blur-sm
              shadow-[0_0_24px_var(--color-primary-500)/15] mb-6"
            animate={{ y: [0,-4,0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="w-4 h-4 text-[var(--color-primary-400)] animate-pulse" />
            <span className="font-body text-xs font-bold text-[var(--color-primary-300)] uppercase tracking-[0.14em]">
              {t("badge")}
            </span>
          </motion.div>

          <h2 className="font-display text-5xl sm:text-6xl md:text-7xl leading-tight mb-5 px-4">
            <span className="theme-gradient-text">{t("title")}</span>
          </h2>

          <p className="font-body text-base sm:text-lg text-white/50 max-w-2xl mx-auto px-4 leading-relaxed">
            {t("description")}
          </p>
        </motion.div>

        {/* ── Main grid: selector left, preview right ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]
          gap-8 xl:gap-14 items-start max-w-6xl mx-auto">

          {/* ── Left: Theme selector grid ── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Currently active label */}
            <div className="flex items-center justify-between mb-5">
              <p className="font-body text-xs font-bold uppercase tracking-[0.14em] text-white/30">
                {t("title")}
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: currentPalette.primary[400] }}
                />
                <span className="font-body text-xs font-semibold text-white/50">
                  {currentPalette.name}
                </span>
              </div>
            </div>

            {/* 2-col card grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-4">
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

            {/* Hint text */}
            <p className="font-body text-[11px] text-white/20 text-center mt-5">
              {t("description")}
            </p>
          </motion.div>

          {/* ── Right: Live preview — sticky on desktop ── */}
          <motion.div
            className="lg:sticky lg:top-8 lg:self-start"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            {/* Preview card wrapper */}
            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/70
              backdrop-blur-xl p-5 sm:p-6
              shadow-[0_24px_64px_rgba(0,0,0,0.5)]">

              {/* Heading inside preview panel */}
              <div className="mb-5 pb-4 border-b border-white/[0.06]">
                <h3 className="font-display text-xl text-white leading-tight mb-0.5">
                  {t("preview.heading")}
                </h3>
                <p className="font-body text-xs text-white/35">{t("preview.subheading")}</p>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTheme}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <InteractivePreview currentPalette={currentPalette} />
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}