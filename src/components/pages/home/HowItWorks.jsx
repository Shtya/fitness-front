"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Calendar, TrendingUp, Sparkles, ArrowRight,
  CheckCircle2, Zap, Award, Activity, Clock,
  BarChart3, Heart, User, Dumbbell, Trophy, Rocket,
} from "lucide-react";
import { useTheme } from "@/app/[locale]/theme";

// ─── NOTE ON INLINE STYLES ────────────────────────────────────────────────────
// colors.primary[N], colors.secondary[N], colors.gradient.* are runtime JS values
// from the theme system — they cannot be pre-compiled as Tailwind classes.
// All structural layout, spacing, typography → pure Tailwind.
// Dynamic palette values → minimal inline style= only.
// ─────────────────────────────────────────────────────────────────────────────

// Stable random positions — computed once, not on every render
const PARTICLE_DATA = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  top:  `${(i * 53 + 7)  % 100}%`,
  dur:  4 + (i % 3),
  del:  (i * 0.3) % 3,
  dx:   ((i % 7) - 3) * 6,
  even: i % 2 === 0,
}));

const POSITIONS = [
  { top: "5%",  left: "5%"  },
  { top: "5%",  right: "5%" },
  { bottom: "5%", left: "15%" },
];

export default function HowItWorks() {
  const [hoveredStep, setHoveredStep] = useState(null);
  const [activeStep,  setActiveStep]  = useState(null);
  const t      = useTranslations("home.howItWorks");
  const { colors } = useTheme();

  const steps = [
    {
      number: "01",
      icon: Target,
      title:       t("steps.0.title"),
      description: t("steps.0.description"),
      features: [
        { icon: User,     text: t("steps.0.features.0") },
        { icon: Target,   text: t("steps.0.features.1") },
        { icon: Activity, text: t("steps.0.features.2") },
      ],
      illustration: { primary: Target,    secondary: [CheckCircle2, Heart,   Zap]    },
    },
    {
      number: "02",
      icon: Calendar,
      title:       t("steps.1.title"),
      description: t("steps.1.description"),
      features: [
        { icon: Calendar, text: t("steps.1.features.0") },
        { icon: Clock,    text: t("steps.1.features.1") },
        { icon: Dumbbell, text: t("steps.1.features.2") },
      ],
      illustration: { primary: Calendar,  secondary: [Clock,  Dumbbell, CheckCircle2] },
    },
    {
      number: "03",
      icon: TrendingUp,
      title:       t("steps.2.title"),
      description: t("steps.2.description"),
      features: [
        { icon: BarChart3,  text: t("steps.2.features.0") },
        { icon: TrendingUp, text: t("steps.2.features.1") },
        { icon: Trophy,     text: t("steps.2.features.2") },
      ],
      illustration: { primary: TrendingUp, secondary: [BarChart3, Award, Trophy] },
    },
  ];

  return (
    <section className="relative py-20 sm:py-24 md:py-28 lg:py-32 overflow-hidden">

      {/* ── Background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Orb 1 */}
        <motion.div
          className="absolute top-20 ltr:right-20 rtl:left-20 w-[500px] h-[500px]
            rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${colors.primary[400]}, transparent)` }}
          animate={{ scale:[1,1.3,1], opacity:[0.18,0.32,0.18], x:[0,40,0], y:[0,25,0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        {/* Orb 2 */}
        <motion.div
          className="absolute bottom-20 ltr:left-20 rtl:right-20 w-[500px] h-[500px]
            rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${colors.secondary[400]}, transparent)` }}
          animate={{ scale:[1.3,1,1.3], opacity:[0.3,0.16,0.3], x:[0,-40,0], y:[0,-25,0] }}
          transition={{ duration: 12, repeat: Infinity, delay: 1 }}
        />
        {/* Orb 3 — centre */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-[400px] h-[400px] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${colors.primary[300]}, transparent)` }}
          animate={{ scale:[1,1.4,1], opacity:[0.12,0.22,0.12], rotate:[0,180,360] }}
          transition={{ duration: 15, repeat: Infinity, delay: 2 }}
        />

        {/* Particles — stable positions */}
        {PARTICLE_DATA.map((p, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              background: p.even ? colors.primary[400] : colors.secondary[400],
              left: p.left,
              top:  p.top,
            }}
            animate={{ y:[0,-28,0], x:[0,p.dx,0], opacity:[0,0.6,0], scale:[0,1.4,0] }}
            transition={{ duration: p.dur, repeat: Infinity, delay: p.del, ease: "easeInOut" }}
          />
        ))}

        {/* Fine grid */}
        <div className="absolute inset-0 opacity-[0.025]
          bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)]
          bg-[size:50px_50px]
          [mask-image:radial-gradient(ellipse_at_50%_50%,black_30%,transparent_80%)]" />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-16">

        {/* ── Section header ── */}
        <motion.div
          className="text-center mb-16 md:mb-24"
          initial={{ opacity: 0, y: -28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full
              border border-[var(--color-primary-500)]/30
              bg-[var(--color-primary-500)]/[0.08] backdrop-blur-xl mb-7"
            animate={{ y: [0,-4,0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div
              animate={{ rotate: 360, scale: [1,1.25,1] }}
              transition={{
                rotate: { duration: 18, repeat: Infinity, ease: "linear" },
                scale:  { duration: 2,  repeat: Infinity },
              }}
            >
              <Sparkles className="w-4 h-4 text-[var(--color-primary-400)]" />
            </motion.div>
            <span className="font-body text-sm font-black uppercase tracking-[0.14em]
              text-[var(--color-primary-300)]">
              {t("badge")}
            </span>
          </motion.div>

          {/* Headline — uses theme-gradient-text utility */}
          <h2 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl
            leading-none tracking-tight mb-6 px-4">
            <span className="theme-gradient-text">{t("title")}</span>
          </h2>

          <p className="font-body text-lg md:text-xl text-white/60
            max-w-3xl mx-auto leading-relaxed px-4">
            {t("description")}
          </p>
        </motion.div>

        {/* ── Steps grid ── */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-10 max-w-6xl mx-auto mb-16">
          {steps.map((step, index) => {
            const Icon               = step.icon;
            const PrimaryIllustration = step.illustration.primary;
            const isHovered          = hoveredStep === index;
            const isActive           = activeStep  === index;
            const lit                = isHovered || isActive;

            return (
              <motion.div
                key={index}
                className="relative"
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.14, duration: 0.65, ease: [0.22,1,0.36,1] }}
                onMouseEnter={() => setHoveredStep(index)}
                onMouseLeave={() => setHoveredStep(null)}
                onClick={() => setActiveStep(lit && isActive ? null : index)}
              >
                {/* ── Connector arrow (desktop only) ── */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-32
                    ltr:left-full rtl:right-full
                    ltr:-translate-x-4 rtl:translate-x-4
                    w-full h-px z-0">
                    {/* Line */}
                    <motion.div
                      className="h-px w-full"
                      style={{
                        background: `linear-gradient(to right, ${colors.primary[500]}, ${colors.secondary[500]})`,
                        opacity: 0.25,
                      }}
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.8 + index * 0.2, duration: 0.7 }}
                    />
                    {/* Arrow chip — centred on line */}
                    <motion.div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 1.2 + index * 0.2, type: "spring" }}
                    >
                      <motion.div
                        className="w-9 h-9 rounded-lg flex items-center justify-center
                          theme-gradient-bg shadow-xl"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      >
                        <ArrowRight className="w-4 h-4 text-white rtl:scale-x-[-1]" strokeWidth={2.5} />
                      </motion.div>
                    </motion.div>
                  </div>
                )}

                {/* ── Card ── */}
                <motion.div
                  className="relative bg-slate-800/40 backdrop-blur-2xl rounded-lg p-7
                    border-2 cursor-pointer overflow-hidden group
                    transition-colors duration-300"
                  style={{
                    borderColor: lit
                      ? colors.primary[500]
                      : `${colors.primary[500]}18`,
                    boxShadow: lit
                      ? `0 28px 56px -10px ${colors.primary[500]}35, 0 0 0 1px ${colors.primary[500]}20`
                      : "0 8px 24px -4px rgba(0,0,0,0.35)",
                  }}
                  whileHover={{ y: -8, scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                >
                  {/* Glow bloom behind card */}
                  <motion.div
                    className="absolute -inset-3 rounded-lg blur-2xl -z-10"
                    style={{ background: `linear-gradient(135deg, ${colors.primary[500]}, ${colors.secondary[500]})` }}
                    animate={{ opacity: lit ? 0.35 : 0, scale: lit ? 1 : 0.85 }}
                    transition={{ duration: 0.4 }}
                  />

                  {/* Shimmer sweep */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(110deg,transparent 25%,rgba(255,255,255,0.08) 50%,transparent 75%)",
                      backgroundSize: "200% 100%",
                    }}
                    animate={isHovered ? { backgroundPosition: ["200% 0", "-200% 0"] } : {}}
                    transition={{ duration: 1.6, repeat: isHovered ? Infinity : 0 }}
                  />

                  <div className="relative z-10">

                    {/* ── Step number badge ── */}
                    <motion.div
                      className="absolute -top-5 ltr:-right-5 rtl:-left-5"
                      initial={{ scale: 0, rotate: -180 }}
                      whileInView={{ scale: 1, rotate: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.14 + 0.4, type: "spring", stiffness: 200, damping: 16 }}
                    >
                      <motion.div
                        className="w-16 h-16 rounded-lg flex items-center justify-center
                          theme-gradient-bg shadow-2xl overflow-hidden relative"
                        whileHover={{ rotate: 15, scale: 1.1 }}
                        transition={{ duration: 0.4 }}
                      >
                        <motion.div
                          className="absolute inset-0 bg-white/20"
                          animate={isHovered ? { scale:[1,1.6,1], opacity:[0.3,0,0.3] } : {}}
                          transition={{ duration: 1.8, repeat: Infinity }}
                        />
                        <span className="font-display text-white text-2xl relative z-10 leading-none">
                          {step.number}
                        </span>
                      </motion.div>
                    </motion.div>

                    {/* ── Illustration area ── */}
                    <div className="mb-7 relative h-52 flex items-center justify-center">
                      {/* BG halos */}
                      <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                          w-44 h-44 rounded-full opacity-[0.08]"
                        style={{ background: `radial-gradient(circle, ${colors.primary[500]}, transparent)` }}
                        animate={isHovered ? { scale:[1,1.35,1], rotate:[0,360] } : { scale: 1 }}
                        transition={{ duration: 4, repeat: isHovered ? Infinity : 0 }}
                      />
                      <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                          w-32 h-32 rounded-full opacity-[0.14]"
                        style={{ background: `radial-gradient(circle, ${colors.secondary[500]}, transparent)` }}
                        animate={isHovered ? { scale:[1.3,1,1.3], rotate:[360,0] } : { scale: 1.3 }}
                        transition={{ duration: 3, repeat: isHovered ? Infinity : 0 }}
                      />
                      {/* Orbiting ring */}
                      <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                          w-36 h-36 rounded-full border opacity-[0.18]"
                        style={{ borderColor: colors.primary[400] }}
                        animate={isHovered ? { rotate: 360 } : {}}
                        transition={{ duration: 7, repeat: isHovered ? Infinity : 0, ease: "linear" }}
                      />
                      {/* Second ring — slower, reverse */}
                      <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                          w-48 h-48 rounded-full border border-dashed opacity-[0.10]"
                        style={{ borderColor: colors.secondary[400] }}
                        animate={isHovered ? { rotate: -360 } : {}}
                        transition={{ duration: 12, repeat: isHovered ? Infinity : 0, ease: "linear" }}
                      />

                      {/* Primary icon */}
                      <motion.div
                        className="relative z-10"
                        whileHover={{ scale: 1.12, rotate: [0,-8,8,-6,0] }}
                        transition={{ duration: 0.5 }}
                      >
                        <motion.div
                          className="w-24 h-24 rounded-lg flex items-center justify-center
                            theme-gradient-bg shadow-2xl overflow-hidden relative"
                          animate={isHovered ? {
                            boxShadow: [
                              `0 16px 48px ${colors.primary[500]}40`,
                              `0 22px 64px ${colors.secondary[500]}55`,
                              `0 16px 48px ${colors.primary[500]}40`,
                            ],
                          } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <motion.div
                            className="absolute inset-0"
                            style={{ background: `radial-gradient(circle at 30% 30%, ${colors.primary[300]}, transparent)` }}
                            animate={isHovered ? { scale:[1,1.6,1], opacity:[0.25,0.55,0.25] } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                          <PrimaryIllustration className="w-12 h-12 text-white relative z-10" strokeWidth={2} />
                        </motion.div>
                      </motion.div>

                      {/* Secondary floating icons */}
                      {step.illustration.secondary.map((SecIcon, idx) => (
                        <motion.div
                          key={idx}
                          className="absolute"
                          style={POSITIONS[idx]}
                          initial={{ opacity: 0, scale: 0 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          animate={{
                            opacity: isHovered ? 1 : 0.55,
                            scale:   isHovered ? 1.08 : 0.88,
                            y: isHovered ? [0,-14,0] : 0,
                            rotate: isHovered ? [0,8,-8,0] : 0,
                          }}
                          transition={{
                            delay: 0.5 + idx * 0.12,
                            y:      { repeat: Infinity, duration: 2.5 + idx * 0.5 },
                            rotate: { repeat: Infinity, duration: 3   + idx * 0.5 },
                          }}
                          whileHover={{ scale: 1.25, rotate: 20 }}
                        >
                          <div
                            className="w-12 h-12 backdrop-blur-xl rounded-lg
                              flex items-center justify-center shadow-xl border"
                            style={{
                              backgroundColor: `${colors.primary[900]}55`,
                              borderColor:     `${colors.primary[500]}28`,
                            }}
                          >
                            <SecIcon className="w-6 h-6" style={{ color: colors.primary[300] }} />
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* ── Text content ── */}
                    <div className="space-y-4">
                      {/* Title row */}
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="w-12 h-12 rounded-lg flex items-center justify-center
                            theme-gradient-bg shadow-lg shrink-0"
                          whileHover={{ rotate: 15, scale: 1.1 }}
                          transition={{ duration: 0.4 }}
                        >
                          <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                        </motion.div>
                        <h3 className="font-body text-xl font-black text-white leading-tight">
                          {step.title}
                        </h3>
                      </div>

                      {/* Description */}
                      <p className="font-body text-sm text-white/55 leading-relaxed">
                        {step.description}
                      </p>

                      {/* Features — revealed on hover / click */}
                      <div className="pt-4 space-y-2 border-t border-white/[0.07]">
                        <AnimatePresence>
                          {lit && step.features.map((feat, idx) => {
                            const FeatIcon = feat.icon;
                            return (
                              <motion.div
                                key={idx}
                                className="flex items-center gap-3 p-2.5 rounded-lg
                                  transition-colors duration-200 cursor-default"
                                style={{ backgroundColor: `${colors.primary[900]}18` }}
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -16 }}
                                transition={{ delay: idx * 0.08, type: "spring", stiffness: 220, damping: 22 }}
                                whileHover={{ x: 4, backgroundColor: `${colors.primary[900]}35` }}
                              >
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                  style={{ background: `linear-gradient(135deg, ${colors.primary[500]}, ${colors.secondary[500]})` }}
                                >
                                  <FeatIcon className="w-4 h-4 text-white" strokeWidth={2.5} />
                                </div>
                                <span className="font-body text-xs text-white/75 font-semibold flex-1 leading-snug">
                                  {feat.text}
                                </span>
                                <CheckCircle2 className="w-4 h-4 shrink-0 opacity-50"
                                  style={{ color: colors.primary[400] }} />
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Bottom accent line */}
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl theme-gradient-bg"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: lit ? 1 : 0 }}
                      transition={{ duration: 0.35 }}
                    />

                    {/* Hover pulse dot */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          className="absolute top-4 ltr:left-4 rtl:right-4"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0 }}
                        >
                          <motion.div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor: colors.primary[400],
                              boxShadow: `0 0 14px ${colors.primary[400]}`,
                            }}
                            animate={{ scale:[1,1.6,1], opacity:[1,0.4,1] }}
                            transition={{ duration: 1.4, repeat: Infinity }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* ── CTA ── */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.7 }}
        >
          <motion.button
            className="group relative inline-flex items-center gap-3
              px-10 py-5 rounded-lg font-body font-black text-lg text-white
              theme-gradient-bg shadow-2xl overflow-hidden"
            style={{ boxShadow: `0 18px 54px ${colors.primary[500]}35` }}
            whileHover={{ scale: 1.04, y: -4 }}
            whileTap={{ scale: 0.96 }}
          >
            {/* Shimmer wipe on hover */}
            <motion.div
              className="absolute inset-0 bg-white/20"
              initial={{ x: "-100%" }}
              whileHover={{ x: "100%" }}
              transition={{ duration: 0.55 }}
            />
            <span className="relative z-10">{t("cta")}</span>
            <motion.div
              className="relative z-10"
              animate={{ x: [0,5,0] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              <Rocket className="w-5 h-5" />
            </motion.div>
          </motion.button>
        </motion.div>

      </div>
    </section>
  );
}