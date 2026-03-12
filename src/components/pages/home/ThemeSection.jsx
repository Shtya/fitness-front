"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette,
  Sparkles,
  Check,
  ChevronRight,
  Droplet,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme, COLOR_PALETTES } from "@/app/[locale]/theme";

// ─── Theme Selector Card ──────────────────────────────────────────────────────
function ThemeSelectorCard({ palette, isActive, onClick, index }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="group relative w-full rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.45 }}
      whileTap={{ scale: 0.97 }}
    >
      <motion.div
        className="absolute -inset-[2px] -z-10 rounded-lg blur-lg"
        style={{
          background: `linear-gradient(135deg, ${palette.gradient.from}, ${palette.gradient.to})`,
        }}
        animate={{ opacity: isActive ? 0.55 : hovered ? 0.3 : 0 }}
        transition={{ duration: 0.3 }}
      />

      <div
        className={[
          "relative overflow-hidden rounded-lg border-2 bg-slate-900/90 backdrop-blur-sm transition-all duration-300",
          isActive
            ? "scale-[1.02] border-white/30 shadow-2xl"
            : "border-white/[0.07] shadow-lg hover:border-white/20",
        ].join(" ")}
      >
        <div
          className="relative h-24 w-full overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${palette.gradient.from}, ${palette.gradient.via}, ${palette.gradient.to})`,
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.08]
            bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.75%22 numOctaves=%223%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')]"
          />

          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
            }}
            animate={
              hovered
                ? { backgroundPosition: ["-200% 0", "200% 0"] }
                : { backgroundPosition: "-200% 0" }
            }
            transition={{ duration: 1.4, ease: "linear" }}
          />

          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                className="absolute top-3 h-7 w-7 rounded-full bg-white shadow-lg ltr:right-3 rtl:left-3 flex items-center justify-center"
              >
                <Check
                  className="h-4 w-4"
                  strokeWidth={3}
                  style={{ color: palette.primary[600] }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-4 pb-3 pt-6">
            <h3 className="font-display text-lg leading-tight text-white drop-shadow-md">
              {palette.name}
            </h3>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3">
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
                className="h-4 w-4 rounded-full border-2 border-slate-900/60"
                style={{ backgroundColor: color }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.06 + idx * 0.04 }}
                whileHover={{ scale: 1.5, zIndex: 10 }}
              />
            ))}
          </div>

          <motion.div
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.07]"
            animate={{ opacity: hovered || isActive ? 1 : 0.4, x: hovered ? 2 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="h-4 w-4 text-white/70 rtl:scale-x-[-1]" />
          </motion.div>
        </div>
      </div>
    </motion.button>
  );
}

// ─── Live Preview Canvas ──────────────────────────────────────────────────────
function InteractivePreview({ currentPalette }) {
  const t = useTranslations("home.theme.themeShowcase");
  const [activeEl, setActiveEl] = useState(null);

  const demoElements = [
    {
      id: "button",
      icon: Zap,
      label: t("preview.button"),
      desc: t("preview.buttonDesc"),
    },
    {
      id: "card",
      icon: Droplet,
      label: t("preview.card"),
      desc: t("preview.cardDesc"),
    },
    {
      id: "badge",
      icon: Sparkles,
      label: t("preview.badge"),
      desc: t("preview.badgeDesc"),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 border-b border-white/[0.07] pb-4">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${currentPalette.gradient.from}, ${currentPalette.gradient.to})`,
          }}
        >
          <Palette className="h-4 w-4 text-white" />
        </div>

        <div>
          <p className="font-body text-sm font-bold leading-tight text-white">
            {t("preview.title")}
          </p>
          <p className="font-body text-[11px] text-white/40">
            {t("preview.subheading")}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {demoElements.map((el, idx) => {
          const Icon = el.icon;
          const isActive = activeEl === el.id;

          return (
            <motion.button
              key={el.id}
              onClick={() => setActiveEl(isActive ? null : el.id)}
              className={[
                "relative w-full overflow-hidden rounded-lg border bg-slate-800/60 text-left backdrop-blur-sm transition-all duration-200",
                isActive
                  ? "border-white/20"
                  : "border-white/[0.06] hover:border-white/12",
              ].join(" ")}
              style={
                isActive
                  ? {
                      boxShadow: `0 0 0 1px ${currentPalette.primary[500]}40, inset 0 0 20px ${currentPalette.primary[500]}08`,
                    }
                  : {}
              }
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileTap={{ scale: 0.99 }}
            >
              {isActive && (
                <motion.div
                  layoutId="preview-accent"
                  className="absolute bottom-0 left-0 top-0 w-[3px] rounded-l-xl"
                  style={{
                    background: `linear-gradient(180deg, ${currentPalette.gradient.from}, ${currentPalette.gradient.to})`,
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              <div className="flex items-start gap-3 p-4">
                <motion.div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${currentPalette.gradient.from}, ${currentPalette.gradient.to})`,
                  }}
                  animate={
                    isActive
                      ? { rotate: [0, -6, 6, -4, 0], scale: [1, 1.1, 1] }
                      : {}
                  }
                  transition={{ duration: 0.5 }}
                >
                  <Icon className="h-5 w-5 text-white" />
                </motion.div>

                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <h4 className="font-body text-sm font-bold text-white">
                      {el.label}
                    </h4>
                    {isActive && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: currentPalette.primary[400] }}
                      />
                    )}
                  </div>

                  <p className="font-body text-[12px] leading-snug text-white/40">
                    {el.desc}
                  </p>

                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.28 }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-lg border border-white/[0.06] bg-slate-950/60 p-4">
                          {el.id === "button" && (
                            <div className="flex flex-wrap items-center gap-3">
                              <motion.button
                                className="font-body rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-lg"
                                style={{
                                  background: `linear-gradient(135deg, ${currentPalette.gradient.from}, ${currentPalette.gradient.to})`,
                                }}
                                whileHover={{ scale: 1.04, y: -1 }}
                                whileTap={{ scale: 0.97 }}
                              >
                                {t("preview.sampleButton")}
                              </motion.button>

                              <motion.button
                                className="font-body rounded-lg border px-5 py-2.5 text-sm font-semibold"
                                style={{
                                  borderColor: `${currentPalette.primary[500]}50`,
                                  color: currentPalette.primary[400],
                                  background: `${currentPalette.primary[500]}10`,
                                }}
                                whileHover={{ scale: 1.04, y: -1 }}
                                whileTap={{ scale: 0.97 }}
                              >
                                {t("preview.secondaryButton")}
                              </motion.button>
                            </div>
                          )}

                          {el.id === "card" && (
                            <div
                              className="rounded-lg border p-4"
                              style={{
                                borderColor: `${currentPalette.primary[500]}25`,
                                background: `linear-gradient(135deg, ${currentPalette.primary[500]}10, ${currentPalette.secondary[500]}08)`,
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="h-10 w-10 shrink-0 rounded-lg"
                                  style={{
                                    background: `linear-gradient(135deg, ${currentPalette.gradient.from}, ${currentPalette.gradient.to})`,
                                  }}
                                />
                                <div className="flex-1 space-y-2">
                                  <div
                                    className="h-2.5 w-3/5 rounded-full"
                                    style={{
                                      backgroundColor: `${currentPalette.primary[500]}40`,
                                    }}
                                  />
                                  <div
                                    className="h-2 w-2/5 rounded-full"
                                    style={{
                                      backgroundColor: `${currentPalette.primary[500]}25`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {el.id === "badge" && (
                            <div className="flex flex-wrap gap-2">
                              {[
                                t("preview.badges.admin"),
                                t("preview.badges.active"),
                                t("preview.badges.featured"),
                              ].map((badge, bi) => (
                                <motion.span
                                  key={badge}
                                  className="font-body rounded-full px-3 py-1 text-xs font-bold"
                                  style={{
                                    background: `${currentPalette.primary[500]}${
                                      ["22", "18", "14"][bi]
                                    }`,
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

                <motion.div
                  animate={{ rotate: isActive ? 90 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="mt-0.5 shrink-0"
                >
                  <ChevronRight
                    className="h-4 w-4 rtl:scale-x-[-1]"
                    style={{
                      color: isActive
                        ? currentPalette.primary[400]
                        : "rgba(255,255,255,0.25)",
                    }}
                  />
                </motion.div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-1">
        <p className="mb-2 font-body text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">
          {t("preview.scalePrimary")}
        </p>
        <div className="flex h-7 overflow-hidden rounded-lg">
          {[900, 800, 700, 600, 500, 400, 300, 200, 100].map((shade) => (
            <motion.div
              key={shade}
              className="flex-1 transition-transform duration-200 hover:z-10 hover:scale-y-110"
              style={{ backgroundColor: currentPalette.primary[shade] }}
              title={`primary-${shade}`}
            />
          ))}
        </div>

        <p className="mb-2 mt-3 font-body text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">
          {t("preview.scaleSecondary")}
        </p>
        <div className="flex h-7 overflow-hidden rounded-lg">
          {[900, 800, 700, 600, 500, 400, 300, 200, 100].map((shade) => (
            <motion.div
              key={shade}
              className="flex-1 transition-transform duration-200 hover:z-10 hover:scale-y-110"
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
    <section className="relative py-16 sm:py-20 md:py-24 lg:py-28">
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-20 h-[500px] w-[500px] rounded-full blur-[100px] opacity-[0.12] ltr:-left-20 rtl:-right-20"
          style={{
            background: `radial-gradient(circle, ${currentPalette.primary[400]}, transparent)`,
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.18, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="absolute -bottom-20 h-[500px] w-[500px] rounded-full blur-[100px] opacity-[0.12] ltr:-right-20 rtl:-left-20"
          style={{
            background: `radial-gradient(circle, ${currentPalette.secondary[400]}, transparent)`,
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.16, 0.1] }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] px-6 lg:px-16">
        <motion.div
          className="mb-12 text-center sm:mb-16"
          initial={{ opacity: 0, y: -24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-primary-500)]/30 bg-[var(--color-primary-500)]/[0.08] px-5 py-2.5 backdrop-blur-sm shadow-[0_0_24px_rgba(99,102,241,0.15)]"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="h-4 w-4 animate-pulse text-[var(--color-primary-400)]" />
            <span className="font-body text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-primary-300)]">
              {t("badge")}
            </span>
          </motion.div>

          <h2 className="font-display mb-5 px-4 text-5xl leading-tight sm:text-6xl md:text-7xl">
            <span className="theme-gradient-text">{t("title")}</span>
          </h2>

          <p className="font-body mx-auto max-w-2xl px-4 text-base leading-relaxed text-white/50 sm:text-lg">
            {t("description")}
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] xl:gap-14">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-5 flex items-center justify-between">
              <p className="font-body text-xs font-bold uppercase tracking-[0.14em] text-white/30">
                {t("selectorTitle")}
              </p>

              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 animate-pulse rounded-full"
                  style={{ backgroundColor: currentPalette.primary[400] }}
                />
                <span className="font-body text-xs font-semibold text-white/50">
                  {currentPalette.name}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {themeEntries.map(([key, palette], index) => (
                <ThemeSelectorCard
                  key={key}
                  palette={palette}
                  isActive={currentTheme === key}
                  onClick={() => setTheme(key)}
                  index={index}
                />
              ))}
            </div>

            <p className="mt-5 text-center font-body text-[11px] text-white/20">
              {t("hint")}
            </p>
          </motion.div>

          <motion.div
            className="lg:sticky lg:top-8 lg:self-start"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <div
              className="rounded-lg border border-white/[0.08] bg-slate-900/70 p-5 shadow-[0_24px_64px_rgba(0,0,0,0.5)]
              backdrop-blur-xl sm:p-6"
            >
              <div className="mb-5 border-b border-white/[0.06] pb-4">
                <h3 className="font-display mb-0.5 text-xl leading-tight text-white">
                  {t("preview.heading")}
                </h3>
                <p className="font-body text-xs text-white/35">
                  {t("preview.subheading")}
                </p>
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