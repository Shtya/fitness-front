"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Zap,
  Crown,
  Rocket,
  Sparkles,
  Star,
} from "lucide-react";
import { useTheme } from "@/app/[locale]/theme";

export default function PricingPlans() {
  const [billingCycle, setBillingCycle] = useState("month");
  const t = useTranslations("home.pricing");
  const { colors } = useTheme();

  const billingCycles = [
    { id: "month", label: t("cycles.month"), discount: null },
    { id: "6months", label: t("cycles.6months"), discount: "15%" },
    { id: "year", label: t("cycles.year"), discount: "30%" },
  ];

  const plans = [
    {
      id: "plus",
      name: t("plans.plus.name"),
      tagline: t("plans.plus.tagline"),
      icon: Zap,
      popular: false,
      pricing: {
        month: 29,
        "6months": 24,
        year: 20,
      },
      features: [
        t("plans.plus.features.0"),
        t("plans.plus.features.1"),
        t("plans.plus.features.2"),
        t("plans.plus.features.3"),
        t("plans.plus.features.4"),
        t("plans.plus.features.5"),
      ],
    },
    {
      id: "professional",
      name: t("plans.professional.name"),
      tagline: t("plans.professional.tagline"),
      icon: Crown,
      popular: true,
      pricing: {
        month: 79,
        "6months": 67,
        year: 55,
      },
      features: [
        t("plans.professional.features.0"),
        t("plans.professional.features.1"),
        t("plans.professional.features.2"),
        t("plans.professional.features.3"),
        t("plans.professional.features.4"),
        t("plans.professional.features.5"),
        t("plans.professional.features.6"),
        t("plans.professional.features.7"),
      ],
    },
    {
      id: "enterprise",
      name: t("plans.enterprise.name"),
      tagline: t("plans.enterprise.tagline"),
      icon: Rocket,
      popular: false,
      pricing: {
        month: 199,
        "6months": 169,
        year: 139,
      },
      features: [
        t("plans.enterprise.features.0"),
        t("plans.enterprise.features.1"),
        t("plans.enterprise.features.2"),
        t("plans.enterprise.features.3"),
        t("plans.enterprise.features.4"),
        t("plans.enterprise.features.5"),
        t("plans.enterprise.features.6"),
        t("plans.enterprise.features.7"),
        t("plans.enterprise.features.8"),
        t("plans.enterprise.features.9"),
      ],
    },
  ];

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

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.215, 0.61, 0.355, 1],
      },
    },
  };

  const featureVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (index) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: index * 0.05,
        duration: 0.4,
      },
    }),
  };

  return (
    <section className="relative py-16 sm:py-20 md:py-24 lg:py-28 overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 ltr:right-10 rtl:left-10 sm:ltr:right-20 sm:rtl:left-20 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-[var(--color-primary-500)] opacity-20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 ltr:left-10 rtl:right-10 sm:ltr:left-20 sm:rtl:right-20 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-[var(--color-secondary-500)] opacity-20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.2, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12 sm:mb-14 md:mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-3 rounded-full bg-[var(--color-primary-500)] bg-opacity-20 border border-[var(--color-primary-500)] border-opacity-30 backdrop-blur-sm mb-4 sm:mb-6"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--color-primary-400)] animate-pulse" />
            <span className="text-xs sm:text-sm font-bold text-[var(--color-primary-200)] uppercase tracking-wide">
              {t("badge")}
            </span>
          </motion.div>

          {/* Title */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white mb-4 sm:mb-6 px-4">
            <span className="theme-gradient-text">{t("title")}</span>
          </h2>

          {/* Description */}
          <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl mx-auto px-4">
            {t("description")}
          </p>
        </motion.div>

        {/* Billing Cycle Tabs */}
        <div className="flex justify-center mb-12 sm:mb-14 md:mb-16 px-4">
          <div className="inline-flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 bg-slate-800 bg-opacity-50 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-slate-700 border-opacity-50 shadow-2xl w-full sm:w-auto overflow-x-auto scrollbar-thin">
            {billingCycles.map((cycle) => {
              const isActive = billingCycle === cycle.id;

              return (
                <motion.button
                  key={cycle.id}
                  onClick={() => setBillingCycle(cycle.id)}
                  className={`relative px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base md:text-lg transition-all whitespace-nowrap ${
                    isActive ? "text-white" : "text-gray-400 hover:text-white"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="billing-active"
                      className="absolute inset-0 theme-gradient-bg rounded-lg sm:rounded-xl shadow-lg shadow-[var(--color-primary-500)] shadow-opacity-40"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="relative z-10 flex flex-col items-center">
                    <span>{cycle.label}</span>
                    {cycle.discount && (
                      <motion.span
                        className="text-[10px] sm:text-xs text-green-400 font-semibold mt-0.5 sm:mt-1"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        {t("save")} {cycle.discount}
                      </motion.span>
                    )}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Pricing Cards */}
        <AnimatePresence mode="wait">
          <motion.div
            key={billingCycle}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              const price = plan.pricing[billingCycle];
              const monthlyEquivalent =
                billingCycle === "6months"
                  ? price * 6
                  : billingCycle === "year"
                  ? price * 12
                  : price;

              return (
                <motion.div
                  key={plan.id}
                  className={`relative group ${
                    plan.popular ? "lg:-mt-4" : ""
                  }`}
                  variants={cardVariants}
                  whileHover={{
                    y: -8,
                    transition: { duration: 0.3 },
                  }}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <motion.div
                      className="absolute -top-3 sm:-top-4 ltr:left-1/2 rtl:right-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 z-20"
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 theme-gradient-bg rounded-full shadow-lg">
                        <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-white" />
                        <span className="text-white font-bold text-xs sm:text-sm uppercase">
                          {t("mostPopular")}
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {/* Card */}
                  <div
                    className={`relative h-full bg-gradient-to-br from-slate-800 from-opacity-80 to-slate-900 to-opacity-80 backdrop-blur-xl rounded-[20px_20px_0_0]  p-6 sm:p-8 border-2 transition-all duration-300 ${
                      plan.popular
                        ? "border-[var(--color-primary-500)] border-opacity-50 shadow-2xl shadow-[var(--color-primary-500)] shadow-opacity-30"
                        : "border-slate-700 border-opacity-50 shadow-xl"
                    }`}
                  >
                    {/* Animated Glow on Hover */}
                    <motion.div
                      className="absolute -inset-1 theme-gradient-bg rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-20 blur-2xl transition-opacity duration-300"
                      aria-hidden="true"
                    />

                    <div className="relative z-10">
                      {/* Icon */}
                      <motion.div
                        className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 theme-gradient-bg rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl mb-4 sm:mb-6"
                        whileHover={{
                          rotate: [0, -10, 10, -10, 0],
                          scale: 1.1,
                        }}
                        transition={{ duration: 0.5 }}
                      >
                        <Icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                      </motion.div>

                      {/* Plan Name */}
                      <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">
                        {plan.name}
                      </h3>
                      <p className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-6">
                        {plan.tagline}
                      </p>

                      {/* Price */}
                      <div className="mb-6 sm:mb-8">
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl sm:text-5xl font-black text-white">
                            ${price}
                          </span>
                          <span className="text-gray-400 font-semibold text-sm sm:text-base">
                            /{t("perMonth")}
                          </span>
                        </div>
                        {billingCycle !== "month" && (
                          <motion.p
                            className="text-xs sm:text-sm text-gray-500 mt-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                          >
                            ${monthlyEquivalent}{" "}
                            {billingCycle === "6months"
                              ? t("per6Months")
                              : t("perYear")}
                          </motion.p>
                        )}
                      </div>

                      {/* CTA Button */}
                      <motion.button
                        className={`w-full py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base md:text-lg mb-6 sm:mb-8 transition-all ${
                          plan.popular
                            ? "theme-gradient-bg text-white shadow-xl shadow-[var(--color-primary-500)] shadow-opacity-40 hover:shadow-2xl"
                            : "bg-slate-700 bg-opacity-50 text-white border-2 border-slate-600 hover:border-slate-500 hover:bg-slate-700"
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {t("getStarted")}
                      </motion.button>

                      {/* Features */}
                      <div className="space-y-3 sm:space-y-4">
                        <p className="text-xs sm:text-sm text-gray-400 font-bold uppercase tracking-wide mb-3 sm:mb-4">
                          {t("whatsIncluded")}
                        </p>
                        {plan.features.map((feature, idx) => (
                          <motion.div
                            key={idx}
                            className="flex items-start gap-2 sm:gap-3"
                            custom={idx}
                            variants={featureVariants}
                            initial="hidden"
                            animate="visible"
                          >
                            <div className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full theme-gradient-bg flex items-center justify-center mt-0.5">
                              <Check
                                className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white"
                                strokeWidth={3}
                              />
                            </div>
                            <span className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                              {feature}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Accent Line */}
                    <motion.div
                      className="absolute bottom-0 ltr:left-0 rtl:right-0 ltr:right-0 rtl:left-0 h-1 theme-gradient-bg rounded-b-2xl sm:rounded-b-3xl origin-left rtl:origin-right"
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
 
      </div>
    </section>
  );
}