"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useTheme } from "@/app/[locale]/theme";
import {
  ClipboardCheck,
  Lightbulb,
  PenTool,
  Code,
  Search,
  Settings,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const stepVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 30,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
    },
  },
};

export const glowVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: [0.2, 0.4, 0.2],
    scale: [0.8, 1.2, 0.8],
    transition: {
      duration: 5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export default function SaaSStepsRoadmap() {
  const [activeStep, setActiveStep] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const t = useTranslations("home.steps");
  const { colors } = useTheme();

  const steps = [
    {
      id: 1,
      categoryStep: t("step") + " 1:",
      title: t("steps.validation.title"),
      description: t("steps.validation.description"),
      icon: ClipboardCheck,
      color: "primary",
    },
    {
      id: 2,
      categoryStep: t("step") + " 2:",
      title: t("steps.features.title"),
      description: t("steps.features.description"),
      icon: Lightbulb,
      color: "secondary",
    },
    {
      id: 3,
      categoryStep: t("step") + " 3:",
      title: t("steps.design.title"),
      description: t("steps.design.description"),
      icon: PenTool,
      color: "primary",
    },
    {
      id: 4,
      categoryStep: t("step") + " 4:",
      title: t("steps.coding.title"),
      description: t("steps.coding.description"),
      icon: Code,
      color: "secondary",
    },
    {
      id: 5,
      categoryStep: t("step") + " 5:",
      title: t("steps.testing.title"),
      description: t("steps.testing.description"),
      icon: Search,
      color: "primary",
    },
    {
      id: 6,
      categoryStep: t("step") + " 6:",
      title: t("steps.optimization.title"),
      description: t("steps.optimization.description"),
      icon: Settings,
      color: "secondary",
    },
  ];

  const toggleStepCompletion = (stepId) => {
    setCompletedSteps((prev) =>
      prev.includes(stepId)
        ? prev.filter((id) => id !== stepId)
        : [...prev, stepId]
    );
  };

  return (
    <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated Gradient Orbs */}
        <motion.div
          variants={glowVariants}
          initial="initial"
          animate="animate"
          className="absolute top-10 md:top-20 ltr:right-10 rtl:left-10 ltr:md:right-20 rtl:md:left-20 w-64 h-64 md:w-96 md:h-96 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, var(--color-primary-500) 0%, transparent 70%)`,
            opacity: 0.2,
          }}
        />
        <motion.div
          variants={glowVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.5 }}
          className="absolute bottom-10 md:bottom-20 ltr:left-10 rtl:right-10 ltr:md:left-20 rtl:md:right-20 w-64 h-64 md:w-96 md:h-96 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, var(--color-secondary-500) 0%, transparent 70%)`,
            opacity: 0.2,
          }}
        />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]" />

        {/* Floating Particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: `var(--color-primary-400)`,
              opacity: 0.3,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6">
        {/* Section Header */}
        <motion.div
          variants={headerVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-12 md:mb-20"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-3 rounded-full backdrop-blur-sm border mb-4 md:mb-6"
            style={{
              background: `linear-gradient(to right, var(--color-primary-500), var(--color-secondary-500))`,
              opacity: 0.2,
              borderColor: `var(--color-primary-500)`,
              borderOpacity: 0.3,
            }}
          >
            <Sparkles 
              className="w-4 h-4 animate-pulse" 
              style={{ color: `var(--color-primary-400)` }}
            />
            <span 
              className="text-xs md:text-sm font-bold uppercase tracking-wide"
              style={{ color: `var(--color-primary-200)` }}
            >
              {t("badge")}
            </span>
          </motion.div>

          {/* Title */}
          <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white mb-4 md:mb-6 leading-tight px-4">
            <span className="theme-gradient-text">{t("title")}</span>
          </h2>

          {/* Description */}
          <p className="text-base md:text-lg lg:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed px-4">
            {t("description")}
          </p>
        </motion.div>

        {/* Steps Container */}
        <div className="relative max-w-7xl mx-auto">
          {/* Horizontal Connection Line - Desktop */}
          <motion.div
            className="hidden lg:block absolute top-16 ltr:left-0 rtl:right-0 ltr:right-0 rtl:left-0 h-0.5"
            style={{
              background: `linear-gradient(to right, transparent, var(--color-primary-500), transparent)`,
              opacity: 0.3,
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
          />

          {/* Progress Line - Desktop */}
          <motion.div
            className="hidden lg:block absolute top-16 ltr:left-0 rtl:right-0 h-0.5 theme-gradient-bg"
            initial={{ width: 0 }}
            animate={{
              width: `${(completedSteps.length / steps.length) * 100}%`,
            }}
            transition={{ duration: 0.5 }}
          />

          {/* Steps Grid */}
          <div className="overflow-x-auto pb-4 lg:overflow-visible scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 scrollbar-thumb-slate-400:hover">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex lg:grid lg:grid-cols-6 gap-4 md:gap-6 lg:gap-4 min-w-max lg:min-w-0 px-4 lg:px-0"
            >
              {steps.map((step, index) => (
                <StepCard
                  key={step.id}
                  step={step}
                  index={index}
                  isActive={activeStep === step.id}
                  isCompleted={completedSteps.includes(step.id)}
                  isLast={index === steps.length - 1}
                  onHoverStart={() => setActiveStep(step.id)}
                  onHoverEnd={() => setActiveStep(null)}
                  onToggleComplete={() => toggleStepCompletion(step.id)}
                />
              ))}
            </motion.div>
          </div>
        </div>
 
      </div>
    </section>
  );
}

// Step Card Component
function StepCard({
  step,
  index,
  isActive,
  isCompleted,
  isLast,
  onHoverStart,
  onHoverEnd,
  onToggleComplete,
}) {
  const Icon = step.icon;

  return (
    <div className="relative flex-shrink-0 w-44 sm:w-48 lg:w-auto">
      {/* Arrow - Desktop Only */}
      {!isLast && (
        <motion.div
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: index * 0.1 + 0.3 }}
          className="hidden lg:block absolute top-16 ltr:-right-2 rtl:-left-2 transform -translate-y-1/2 z-20"
        >
          <ArrowRight
            className={`w-5 h-5 transition-colors rtl:rotate-180 ${
              isCompleted ? "" : ""
            }`}
            style={{
              color: isCompleted ? `var(--color-primary-400)` : `rgb(71, 85, 105)`,
            }}
          />
        </motion.div>
      )}

      {/* Step Card */}
      <motion.div
        variants={stepVariants}
        onHoverStart={onHoverStart}
        onHoverEnd={onHoverEnd}
        whileHover={{ y: -8 }}
        className="relative cursor-pointer"
        onClick={onToggleComplete}
      >
        {/* Circle Container */}
        <div className="flex flex-col items-center mb-3 md:mb-4">
          {/* Outer Dashed Circle */}
          <motion.div
            className="relative w-28 h-28 md:w-32 md:h-32 rounded-full border-2 border-dashed flex items-center justify-center"
            style={{
              borderColor: isCompleted 
                ? `var(--color-primary-400)` 
                : `var(--color-primary-400)`,
              borderOpacity: isCompleted ? 0.6 : 0.3,
            }}
            animate={{
              rotate: isActive ? 360 : 0,
            }}
            transition={{
              rotate: { duration: 2, ease: "linear" },
            }}
          >
            {/* Progress Arc */}
            <svg
              className="absolute inset-0 w-28 h-28 md:w-32 md:h-32 -rotate-90"
              viewBox="0 0 128 128"
            >
              <motion.circle
                cx="64"
                cy="64"
                r="60"
                fill="none"
                stroke={`var(--color-primary-500)`}
                strokeWidth="4"
                strokeDasharray="377"
                strokeLinecap="round"
                initial={{ strokeDashoffset: 377 }}
                animate={{
                  strokeDashoffset: isCompleted
                    ? 0
                    : isActive
                    ? 377 * 0.3
                    : 377 - (377 * (step.id / 6)),
                }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>

            {/* Inner Circle with Icon */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shadow-xl border z-10"
              style={{
                background: isCompleted
                  ? `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`
                  : `linear-gradient(to bottom right, rgba(51, 65, 85, 0.5), rgba(30, 41, 59, 0.5))`,
                backdropFilter: 'blur(4px)',
                borderColor: isCompleted 
                  ? `var(--color-primary-400)` 
                  : `rgb(71, 85, 105)`,
                borderOpacity: isCompleted ? 0.5 : 0.5,
              }}
            >
              {/* Completion Checkmark */}
              {isCompleted && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-white" />
                </motion.div>
              )}

              {/* Icon */}
              <Icon
                className={`w-8 h-8 md:w-10 md:h-10 transition-all ${
                  isCompleted ? "opacity-0" : ""
                }`}
                style={{
                  color: isCompleted
                    ? "white"
                    : isActive
                    ? `var(--color-primary-300)`
                    : `rgb(156, 163, 175)`,
                }}
                strokeWidth={1.5}
              />

              {/* Shine Effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full rtl:translate-x-full ltr:-translate-x-full"
                animate={{
                  translateX: isActive ? "200%" : "-100%",
                }}
                transition={{
                  duration: 1,
                  repeat: isActive ? Infinity : 0,
                  repeatDelay: 1,
                }}
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Step Number */}
        <div className="text-center mb-2">
          <span
            className="text-sm md:text-base font-bold transition-colors"
            style={{
              color: isCompleted
                ? `var(--color-primary-600)`
                : isActive
                ? `var(--color-primary-300)`
                : `var(--color-primary-400)`,
            }}
          >
            {step.categoryStep}
          </span>
        </div>

        {/* Title */}
        <h3
          className={`text-base md:text-lg font-bold text-center mb-2 px-2 transition-all ${
            isCompleted ? "theme-gradient-text" : ""
          }`}
          style={{
            color: isCompleted
              ? undefined
              : isActive
              ? "white"
              : `rgb(209, 213, 219)`,
          }}
        >
          {step.title}
        </h3>

        {/* Description - Hidden on mobile */}
        <p className="hidden lg:block text-gray-400 text-center text-xs leading-relaxed px-2 group-hover:text-gray-300 transition-colors">
          {step.description}
        </p>

        {/* Completion Badge - Mobile */}
        {isCompleted && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="lg:hidden absolute -top-2 ltr:-right-2 rtl:-left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold"
          >
            ✓
          </motion.div>
        )}

        {/* Glow Effect on Hover/Active */}
        <motion.div
          className="absolute inset-0 rounded-2xl -z-10 blur-xl"
          style={{
            backgroundColor: isCompleted 
              ? `var(--color-primary-500)` 
              : `var(--color-primary-500)`,
            opacity: isCompleted ? 0.2 : 0.1,
          }}
          animate={{
            scale: isActive || isCompleted ? 1.2 : 1,
            opacity: isActive || isCompleted ? (isCompleted ? 0.2 : 0.1) : 0,
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Click Indicator */}
        <motion.div
          className="absolute -bottom-6 ltr:left-1/2 rtl:right-1/2 transform ltr:-translate-x-1/2 rtl:translate-x-1/2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden lg:block"
          initial={{ y: -5 }}
          animate={{ y: 0 }}
        >
          {isCompleted ? "انقر للإلغاء" : "انقر للإكمال"}
        </motion.div>
      </motion.div>
    </div>
  );
}