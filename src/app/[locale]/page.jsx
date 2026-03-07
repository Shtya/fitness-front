"use client";

import { useState } from "react";
import {
  ClipboardCheck, Lightbulb, PenTool, Code,
  Search, Settings, Sparkles, ArrowRight,
  CheckCircle2, Trophy, Target, TrendingUp,
  Users, Check, Zap, Crown, Rocket, Star,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/app/[locale]/theme";

import FitnessHero          from "@/components/pages/home/hero";
import RoleTabsDemo         from "@/components/pages/home/RoleTabs";
import Testimonials         from "@/components/pages/home/Testimonials";
import ContactUs            from "@/components/pages/home/Contactus";
import FAQs                 from "@/components/pages/home/Faqs";
import HowItWork            from "@/components/pages/home/HowItWorks";
import Navbar               from "@/components/pages/home/Navbar";
import ThemeShowcaseSection from "@/components/pages/home/ThemeSection";
import Footer               from "@/components/pages/home/Footer";

// ─── Shared animation variants ────────────────────────────────────────────────
export const glowVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: [0.2, 0.4, 0.2],
    scale:   [0.8, 1.2, 0.8],
    transition: { duration: 5, repeat: Infinity, ease: "easeInOut" },
  },
};

const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25,0.1,0.25,1], delay } },
});

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Page() {
  return (
    <div className="min-h-screen antialiased bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Global grid texture */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none z-0
        bg-[linear-gradient(rgba(99,102,241,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.3)_1px,transparent_1px)]
        bg-[size:50px_50px]" />

      <div className="relative z-10">
        <Navbar />
        <FitnessHero />
        <SectionDivider label="stats" />
        <StatsBar />
        <SectionDivider label="themes" variant="subtle" />
        <ThemeShowcaseSection />
        <SectionDivider label="how" />
        <HowItWork />
        <SectionDivider label="roles" variant="subtle" />
        <RoleTabsDemo />
        <SectionDivider label="steps" />
        <Steps />
        <SectionDivider label="pricing" variant="subtle" />
        <PricingPlans />
        <SectionDivider label="reviews" />
        <Testimonials />
        <SectionDivider label="faq" variant="subtle" />
        <FAQs />
        <SectionDivider label="contact" />
        <ContactUs />
        <Footer />
      </div>
    </div>
  );
}

// ─── Section Divider ──────────────────────────────────────────────────────────
// Editorial "tape stripe" feel — a centered pill with label text + flanking lines
function SectionDivider({ variant = "default", label = "" }) {
  if (variant === "subtle") {
    return (
      <div className="py-8 sm:py-10">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-16">
          <motion.div
            className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
            initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }}
            viewport={{ once: true }} transition={{ duration: 1 }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative py-10 sm:py-14 overflow-hidden">
      {/* Faint radial bloom */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-64 h-20 rounded-full blur-3xl opacity-20 pointer-events-none
          bg-[radial-gradient(ellipse,var(--color-primary-500),transparent_70%)]"
        animate={{ scale:[1,1.3,1], opacity:[0.15,0.25,0.15] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      <div className="max-w-[1440px] mx-auto px-6 lg:px-16 relative z-10">
        <div className="flex items-center gap-4">
          {/* Left line */}
          <motion.div
            className="flex-1 h-px bg-gradient-to-r from-transparent to-[var(--color-primary-500)]/40"
            initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }}
            viewport={{ once: true }} transition={{ duration: 0.8 }}
          />

          {/* Center pill */}
          <motion.div
            className="flex items-center gap-2 px-4 py-1.5
              border border-[var(--color-primary-500)]/25
              bg-[var(--color-primary-500)]/[0.07] rounded-full backdrop-blur-sm"
            initial={{ scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }} transition={{ delay: 0.35, type: "spring", stiffness: 240 }}
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary-400)] animate-pulse" />
            <span className="text-[10px] font-bold font-body uppercase tracking-[0.18em] text-[var(--color-primary-300)]/70">
              {label}
            </span>
          </motion.div>

          {/* Right line */}
          <motion.div
            className="flex-1 h-px bg-gradient-to-l from-transparent to-[var(--color-secondary-500)]/40"
            initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }}
            viewport={{ once: true }} transition={{ duration: 0.8 }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
// "Scoreboard" layout — oversized numerals, minimal decoration
function StatsBar() {
  const t = useTranslations("home.hero");

  const stats = [
    { icon: Trophy,    value: t("stats.coaches.value"),  label: t("stats.coaches.label") },
    { icon: Target,    value: t("stats.members.value"),  label: t("stats.members.label") },
    { icon: TrendingUp,value: t("stats.programs.value"), label: t("stats.programs.label") },
    { icon: Users,     value: "50,000+",                 label: t("trust.activeUsers") },
  ];

  return (
    <section className="relative py-12 sm:py-16 md:py-20 overflow-hidden">
      {/* Subtle horizontal scan line */}
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2
        bg-gradient-to-r from-transparent via-[var(--color-primary-500)]/10 to-transparent
        pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-6 lg:px-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0
          divide-white/[0.06] border border-white/[0.06] rounded-2xl overflow-hidden
          bg-white/[0.02] backdrop-blur-sm">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={i}
                className="group relative flex flex-col items-center justify-center
                  gap-3 px-6 py-8 sm:py-10 text-center overflow-hidden"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.55 }}
              >
                {/* Hover bloom */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500
                  bg-[radial-gradient(ellipse_at_center,var(--color-primary-500)/8%,transparent_70%)]" />

                {/* Icon chip */}
                <div className="relative w-10 h-10 rounded-xl theme-gradient-bg
                  flex items-center justify-center shadow-lg
                  group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                  <Icon className="w-5 h-5 text-white" />
                </div>

                {/* Big number */}
                <p className="font-display text-4xl sm:text-5xl lg:text-6xl
                  theme-gradient-text leading-none tracking-tight">
                  {stat.value}
                </p>

                {/* Label */}
                <p className="font-body text-[11px] font-bold uppercase tracking-[0.14em]
                  text-white/40 group-hover:text-white/60 transition-colors">
                  {stat.label}
                </p>

                {/* Bottom accent bar */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-[2px] theme-gradient-bg origin-left"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Steps ───────────────────────────────────────────────────────────────────
// Large numbered circular steps on a dotted horizontal track
function Steps() {
  const [activeStep, setActiveStep]       = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const t = useTranslations("home.steps");

  const steps = [
    { id: 1, icon: ClipboardCheck, label: t("step") + " 01", title: t("steps.validation.title"),   desc: t("steps.validation.description") },
    { id: 2, icon: Lightbulb,      label: t("step") + " 02", title: t("steps.features.title"),     desc: t("steps.features.description") },
    { id: 3, icon: PenTool,        label: t("step") + " 03", title: t("steps.design.title"),       desc: t("steps.design.description") },
    { id: 4, icon: Code,           label: t("step") + " 04", title: t("steps.coding.title"),       desc: t("steps.coding.description") },
    { id: 5, icon: Search,         label: t("step") + " 05", title: t("steps.testing.title"),      desc: t("steps.testing.description") },
    { id: 6, icon: Settings,       label: t("step") + " 06", title: t("steps.optimization.title"), desc: t("steps.optimization.description") },
  ];

  const toggle = (id) =>
    setCompletedSteps(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);

  const progress = (completedSteps.length / steps.length) * 100;

  return (
    <section className="relative py-16 md:py-24 overflow-hidden
      bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">

      {/* Background orbs */}
      <motion.div
        variants={glowVariants} initial="initial" animate="animate"
        className="absolute top-20 right-10 md:right-20 w-64 md:w-96 h-64 md:h-96
          rounded-full blur-3xl pointer-events-none
          bg-[radial-gradient(circle,var(--color-primary-500)_0%,transparent_70%)] opacity-20"
      />
      <motion.div
        variants={glowVariants} initial="initial" animate="animate"
        className="absolute bottom-20 left-10 md:left-20 w-64 md:w-96 h-64 md:h-96
          rounded-full blur-3xl pointer-events-none
          bg-[radial-gradient(circle,var(--color-secondary-500)_0%,transparent_70%)] opacity-20"
        style={{ animationDelay: "0.5s" }}
      />
      {/* Fine grid */}
      <div className="absolute inset-0 pointer-events-none
        bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)]
        bg-[size:100px_100px]
        [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]" />

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-16">

        {/* Header */}
        <motion.div
          className="text-center mb-16 md:mb-24"
          initial={{ opacity: 0, y: -24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6
            rounded-full border border-[var(--color-primary-500)]/30
            bg-[var(--color-primary-500)]/[0.08] backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-[var(--color-primary-400)] animate-pulse" />
            <span className="font-body text-xs font-bold uppercase tracking-[0.14em]
              text-[var(--color-primary-300)]">
              {t("badge")}
            </span>
          </div>

          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl text-white
            leading-tight mb-4 px-4">
            <span className="theme-gradient-text">{t("title")}</span>
          </h2>
          <p className="font-body text-base md:text-lg text-white/50
            max-w-2xl mx-auto px-4 leading-relaxed">
            {t("description")}
          </p>
        </motion.div>

        {/* Progress indicator */}
        <div className="mb-10 max-w-sm mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="font-body text-xs font-semibold text-white/40 uppercase tracking-widest">
              {t("progress") || "Progress"}
            </span>
            <span className="font-body text-xs font-bold text-[var(--color-primary-400)]">
              {completedSteps.length}/{steps.length}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
            <motion.div
              className="h-full theme-gradient-bg rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Steps track */}
        <div className="relative">
          {/* Dotted track — desktop */}
          <div className="hidden lg:block absolute top-[52px] left-[calc(1/12*100%)] right-[calc(1/12*100%)]
            h-px border-t-2 border-dashed border-white/[0.08]" />
          {/* Progress fill on track */}
          <motion.div
            className="hidden lg:block absolute top-[52px] left-[calc(1/12*100%)] h-[2px] theme-gradient-bg"
            style={{ right: "auto" }}
            animate={{ width: `${progress * 0.833}%` }}
            transition={{ duration: 0.5 }}
          />

          {/* Horizontal scroll on mobile */}
          <div className="overflow-x-auto pb-6 lg:overflow-visible
            scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
            <div className="flex lg:grid lg:grid-cols-6 gap-3 min-w-max lg:min-w-0 px-2 lg:px-0">
              {steps.map((step, i) => {
                const Icon     = step.icon;
                const done     = completedSteps.includes(step.id);
                const isActive = activeStep === step.id;

                return (
                  <motion.div
                    key={step.id}
                    className="flex flex-col items-center text-center cursor-pointer group
                      w-40 lg:w-auto"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                    whileHover={{ y: -6 }}
                    onMouseEnter={() => setActiveStep(step.id)}
                    onMouseLeave={() => setActiveStep(null)}
                    onClick={() => toggle(step.id)}
                  >
                    {/* Step number badge */}
                    <div className={[
                      "font-display text-[10px] tracking-[0.2em] mb-3 transition-colors duration-200",
                      done ? "text-[var(--color-primary-400)]" :
                        isActive ? "text-[var(--color-primary-300)]" : "text-white/25",
                    ].join(" ")}>
                      {step.label}
                    </div>

                    {/* Circle */}
                    <div className="relative mb-4">
                      {/* Outer ring — dashed, spins on active */}
                      <motion.div
                        className={[
                          "w-[88px] h-[88px] rounded-full border-2 border-dashed",
                          "flex items-center justify-center",
                          done   ? "border-[var(--color-primary-400)]/60"
                               : isActive ? "border-[var(--color-primary-400)]/40"
                                          : "border-white/[0.12]",
                        ].join(" ")}
                        animate={{ rotate: isActive && !done ? 360 : 0 }}
                        transition={{ duration: 3, ease: "linear", repeat: isActive ? Infinity : 0 }}
                      >
                        {/* SVG progress arc */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 88 88">
                          <motion.circle
                            cx="44" cy="44" r="40"
                            fill="none"
                            stroke="var(--color-primary-500)"
                            strokeWidth="2"
                            strokeDasharray="251"
                            strokeLinecap="round"
                            initial={{ strokeDashoffset: 251 }}
                            animate={{ strokeDashoffset: done ? 0 : 251 - (251 * (step.id / 6)) }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                        </svg>

                        {/* Inner filled circle */}
                        <motion.div
                          className={[
                            "relative w-[60px] h-[60px] rounded-full z-10",
                            "flex items-center justify-center",
                            "border transition-all duration-300",
                            done
                              ? "theme-gradient-bg border-[var(--color-primary-400)]/40 shadow-[0_0_20px_var(--color-primary-500)/40]"
                              : "bg-slate-800/60 border-slate-600/50 backdrop-blur-sm",
                          ].join(" ")}
                          whileHover={{ scale: 1.08 }}
                          transition={{ type: "spring", stiffness: 320 }}
                        >
                          {done ? (
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              className="flex items-center justify-center"
                            >
                              <CheckCircle2 className="w-7 h-7 text-white" />
                            </motion.div>
                          ) : (
                            <Icon
                              className={[
                                "w-6 h-6 transition-colors duration-200",
                                isActive ? "text-[var(--color-primary-300)]" : "text-white/40",
                              ].join(" ")}
                              strokeWidth={1.5}
                            />
                          )}
                        </motion.div>
                      </motion.div>

                      {/* Glow bloom */}
                      <motion.div
                        className="absolute inset-0 rounded-full blur-2xl -z-10
                          bg-[var(--color-primary-500)]/20"
                        animate={{ scale: isActive || done ? 1.4 : 1, opacity: isActive || done ? 1 : 0 }}
                        transition={{ duration: 0.3 }}
                      />

                      {/* Completion badge — mobile */}
                      {done && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full
                            bg-emerald-500 flex items-center justify-center lg:hidden"
                        >
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </motion.div>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className={[
                      "font-body text-sm font-bold mb-1.5 px-2 transition-colors duration-200",
                      done   ? "theme-gradient-text"
                             : isActive ? "text-white" : "text-white/60",
                    ].join(" ")}>
                      {step.title}
                    </h3>

                    {/* Description — desktop only */}
                    <p className="hidden lg:block font-body text-[11px] text-white/35
                      leading-relaxed px-1 group-hover:text-white/50 transition-colors">
                      {step.desc}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

// ─── Pricing Plans ────────────────────────────────────────────────────────────
function PricingPlans() {
  const [cycle, setCycle] = useState("month");
  const t = useTranslations("home.pricing");

  const cycles = [
    { id: "month",   label: t("cycles.month"),   discount: null },
    { id: "6months", label: t("cycles.6months"), discount: "15%" },
    { id: "year",    label: t("cycles.year"),    discount: "30%" },
  ];

  const plans = [
    {
      id: "plus",
      name:    t("plans.plus.name"),
      tagline: t("plans.plus.tagline"),
      icon:    Zap,
      popular: false,
      pricing: { month: 29, "6months": 24, year: 20 },
      features: Array.from({ length: 6 },  (_, i) => t(`plans.plus.features.${i}`)),
    },
    {
      id: "professional",
      name:    t("plans.professional.name"),
      tagline: t("plans.professional.tagline"),
      icon:    Crown,
      popular: true,
      pricing: { month: 79, "6months": 67, year: 55 },
      features: Array.from({ length: 8 }, (_, i) => t(`plans.professional.features.${i}`)),
    },
    {
      id: "enterprise",
      name:    t("plans.enterprise.name"),
      tagline: t("plans.enterprise.tagline"),
      icon:    Rocket,
      popular: false,
      pricing: { month: 199, "6months": 169, year: 139 },
      features: Array.from({ length: 10 }, (_, i) => t(`plans.enterprise.features.${i}`)),
    },
  ];

  return (
    <section className="relative py-16 sm:py-20 md:py-28 overflow-hidden">
      {/* BG orb */}
      <motion.div
        className="absolute top-20 right-10 w-72 sm:w-[400px] h-72 sm:h-[400px]
          rounded-full blur-3xl opacity-20 pointer-events-none
          bg-[radial-gradient(circle,var(--color-primary-500),transparent)]"
        animate={{ scale:[1,1.2,1], opacity:[0.2,0.3,0.2] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-16">

        {/* Header */}
        <motion.div
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: -20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full
            border border-[var(--color-primary-500)]/30
            bg-[var(--color-primary-500)]/[0.08] backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-[var(--color-primary-400)] animate-pulse" />
            <span className="font-body text-xs font-bold uppercase tracking-[0.14em]
              text-[var(--color-primary-300)]">
              {t("badge")}
            </span>
          </div>

          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl text-white
            leading-tight mb-4 px-4">
            <span className="theme-gradient-text">{t("title")}</span>
          </h2>
          <p className="font-body text-base sm:text-lg text-white/50 max-w-2xl mx-auto px-4">
            {t("description")}
          </p>
        </motion.div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1 p-1.5
            bg-white/[0.04] backdrop-blur-xl rounded-xl
            border border-white/[0.08] shadow-2xl">
            {cycles.map((c) => {
              const active = cycle === c.id;
              return (
                <motion.button
                  key={c.id}
                  onClick={() => setCycle(c.id)}
                  className={[
                    "relative px-5 sm:px-7 py-3 rounded-[10px]",
                    "font-body font-bold text-sm transition-colors duration-200",
                    active ? "text-white" : "text-white/40 hover:text-white/70",
                  ].join(" ")}
                  whileTap={{ scale: 0.97 }}
                >
                  {active && (
                    <motion.div
                      layoutId="cycle-bg"
                      className="absolute inset-0 theme-gradient-bg rounded-[10px]
                        shadow-[0_0_20px_var(--color-primary-500)/35]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex flex-col items-center gap-0.5">
                    <span>{c.label}</span>
                    {c.discount && (
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        {t("save")} {c.discount}
                      </span>
                    )}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Cards */}
        <AnimatePresence mode="wait">
          <motion.div
            key={cycle}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 max-w-5xl mx-auto"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            {plans.map((plan, i) => (
              <PricingCard key={plan.id} plan={plan} cycle={cycle} index={i} t={t} />
            ))}
          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
}

// ─── Pricing Card ─────────────────────────────────────────────────────────────
// Popular plan is "inverted" — full gradient bg, dark text not needed — white
function PricingCard({ plan, cycle, index, t }) {
  const Icon  = plan.icon;
  const price = plan.pricing[cycle];
  const total = cycle === "6months" ? price * 6 : cycle === "year" ? price * 12 : price;

  return (
    <motion.div
      className={`relative ${plan.popular ? "md:-mt-4 md:mb-4" : ""}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
    >
      {/* Popular badge — floats above */}
      {plan.popular && (
        <motion.div
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20
            flex items-center gap-1.5 px-4 py-1.5
            theme-gradient-bg rounded-full shadow-lg"
          initial={{ y: -8, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <Star className="w-3.5 h-3.5 text-white fill-white" />
          <span className="font-body text-white text-[11px] font-bold uppercase tracking-wider">
            {t("mostPopular")}
          </span>
        </motion.div>
      )}

      {/* Card body */}
      <div className={[
        "relative h-full rounded-2xl p-6 sm:p-7 border overflow-hidden",
        "flex flex-col transition-shadow duration-300",
        plan.popular
          ? "theme-gradient-bg border-[var(--color-primary-400)]/30 shadow-[0_20px_60px_var(--color-primary-500)/30]"
          : "bg-slate-800/50 border-white/[0.08] backdrop-blur-xl hover:border-[var(--color-primary-500)]/30",
      ].join(" ")}>

        {/* Shimmer overlay for popular */}
        {plan.popular && (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0%,transparent_60%)] pointer-events-none" />
        )}

        {/* Icon + name row */}
        <div className="flex items-start gap-4 mb-5">
          <motion.div
            className={[
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
              plan.popular ? "bg-white/20" : "theme-gradient-bg",
            ].join(" ")}
            whileHover={{ rotate: -8, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Icon className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h3 className={[
              "font-body text-xl font-black leading-tight",
              plan.popular ? "text-white" : "text-white",
            ].join(" ")}>
              {plan.name}
            </h3>
            <p className={[
              "font-body text-xs mt-0.5",
              plan.popular ? "text-white/70" : "text-white/40",
            ].join(" ")}>
              {plan.tagline}
            </p>
          </div>
        </div>

        {/* Price block */}
        <div className="mb-6 pb-6 border-b border-white/[0.1]">
          <div className="flex items-baseline gap-1.5">
            <span className={[
              "font-display text-5xl leading-none",
              plan.popular ? "text-white" : "theme-gradient-text",
            ].join(" ")}>
              ${price}
            </span>
            <span className={[
              "font-body text-sm",
              plan.popular ? "text-white/60" : "text-white/40",
            ].join(" ")}>
              /{t("perMonth")}
            </span>
          </div>
          {cycle !== "month" && (
            <p className={[
              "font-body text-xs mt-1.5",
              plan.popular ? "text-white/55" : "text-white/35",
            ].join(" ")}>
              ${total} {cycle === "6months" ? t("per6Months") : t("perYear")}
            </p>
          )}
        </div>

        {/* CTA */}
        <motion.button
          className={[
            "w-full py-3.5 rounded-xl font-body font-bold text-sm mb-7",
            "border transition-all duration-200",
            plan.popular
              ? "bg-white text-[var(--color-primary-700)] border-transparent hover:bg-white/90"
              : "theme-gradient-bg text-white border-transparent shadow-[0_4px_16px_var(--color-primary-500)/25] hover:shadow-[0_6px_24px_var(--color-primary-500)/40]",
          ].join(" ")}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          {t("getStarted")}
        </motion.button>

        {/* Features */}
        <div className="flex-1 space-y-3">
          <p className={[
            "font-body text-[10px] font-bold uppercase tracking-[0.14em] mb-3",
            plan.popular ? "text-white/50" : "text-white/30",
          ].join(" ")}>
            {t("whatsIncluded")}
          </p>
          {plan.features.map((feature, idx) => (
            <motion.div
              key={idx}
              className="flex items-start gap-2.5"
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.04 }}
            >
              <div className={[
                "shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5",
                plan.popular ? "bg-white/25" : "theme-gradient-bg",
              ].join(" ")}>
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </div>
              <span className={[
                "font-body text-sm leading-snug",
                plan.popular ? "text-white/80" : "text-white/55",
              ].join(" ")}>
                {feature}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Bottom accent — non-popular cards only */}
        {!plan.popular && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-[3px] theme-gradient-bg origin-left"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
          />
        )}
      </div>
    </motion.div>
  );
}