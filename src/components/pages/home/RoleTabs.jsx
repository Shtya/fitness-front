"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useTheme } from "@/app/[locale]/theme";
import {
  User,
  Dumbbell,
  Shield,
  Calendar,
  TrendingUp,
  Heart,
  Users,
  ClipboardList,
  BarChart3,
  Settings,
  Award,
  Target,
  Activity,
  MessageSquare,
  FileText,
  Lock,
  Zap,
  Trophy,
  Video,
  BookOpen,
  DollarSign,
  UserCheck,
  Bell,
  Database,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 20,
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
  exit: {
    opacity: 0,
    scale: 0.8,
    y: -20,
    transition: {
      duration: 0.2,
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

const glowVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: [0.3, 0.6, 0.3],
    scale: [0.8, 1.2, 0.8],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export default function RoleTabsFinal() {
  const [activeTab, setActiveTab] = useState("client");
  const t = useTranslations("home.roles");
  const { colors } = useTheme();

  const tabs = [
    {
      id: "client",
      label: t("tabs.client"),
      icon: User,
      colorClass: "client",
    },
    {
      id: "coach",
      label: t("tabs.coach"),
      icon: Dumbbell,
      colorClass: "coach",
    },
    {
      id: "admin",
      label: t("tabs.admin"),
      icon: Shield,
      colorClass: "admin",
    },
  ];

  const features = {
    client: [
      {
        icon: Calendar,
        title: t("client.features.schedule.title"),
        description: t("client.features.schedule.description"),
        badge: t("client.features.schedule.badge"),
      },
      {
        icon: Activity,
        title: t("client.features.tracking.title"),
        description: t("client.features.tracking.description"),
        badge: t("client.features.tracking.badge"),
      },
      {
        icon: Video,
        title: t("client.features.tutorials.title"),
        description: t("client.features.tutorials.description"),
        badge: t("client.features.tutorials.badge"),
      },
      {
        icon: TrendingUp,
        title: t("client.features.progress.title"),
        description: t("client.features.progress.description"),
        badge: t("client.features.progress.badge"),
      },
      {
        icon: Heart,
        title: t("client.features.health.title"),
        description: t("client.features.health.description"),
        badge: t("client.features.health.badge"),
      },
      {
        icon: MessageSquare,
        title: t("client.features.chat.title"),
        description: t("client.features.chat.description"),
        badge: t("client.features.chat.badge"),
      },
      {
        icon: Target,
        title: t("client.features.goals.title"),
        description: t("client.features.goals.description"),
        badge: t("client.features.goals.badge"),
      },
      {
        icon: BookOpen,
        title: t("client.features.nutrition.title"),
        description: t("client.features.nutrition.description"),
        badge: t("client.features.nutrition.badge"),
      },
    ],
    coach: [
      {
        icon: Users,
        title: t("coach.features.clients.title"),
        description: t("coach.features.clients.description"),
        badge: t("coach.features.clients.badge"),
      },
      {
        icon: ClipboardList,
        title: t("coach.features.plans.title"),
        description: t("coach.features.plans.description"),
        badge: t("coach.features.plans.badge"),
      },
      {
        icon: BarChart3,
        title: t("coach.features.analytics.title"),
        description: t("coach.features.analytics.description"),
        badge: t("coach.features.analytics.badge"),
      },
      {
        icon: Calendar,
        title: t("coach.features.scheduling.title"),
        description: t("coach.features.scheduling.description"),
        badge: t("coach.features.scheduling.badge"),
      },
      {
        icon: Award,
        title: t("coach.features.certifications.title"),
        description: t("coach.features.certifications.description"),
        badge: t("coach.features.certifications.badge"),
      },
      {
        icon: MessageSquare,
        title: t("coach.features.messaging.title"),
        description: t("coach.features.messaging.description"),
        badge: t("coach.features.messaging.badge"),
      },
      {
        icon: FileText,
        title: t("coach.features.reports.title"),
        description: t("coach.features.reports.description"),
        badge: t("coach.features.reports.badge"),
      },
      {
        icon: DollarSign,
        title: t("coach.features.earnings.title"),
        description: t("coach.features.earnings.description"),
        badge: t("coach.features.earnings.badge"),
      },
    ],
    admin: [
      {
        icon: Database,
        title: t("admin.features.management.title"),
        description: t("admin.features.management.description"),
        badge: t("admin.features.management.badge"),
      },
      {
        icon: UserCheck,
        title: t("admin.features.verification.title"),
        description: t("admin.features.verification.description"),
        badge: t("admin.features.verification.badge"),
      },
      {
        icon: BarChart3,
        title: t("admin.features.reporting.title"),
        description: t("admin.features.reporting.description"),
        badge: t("admin.features.reporting.badge"),
      },
      {
        icon: Settings,
        title: t("admin.features.settings.title"),
        description: t("admin.features.settings.description"),
        badge: t("admin.features.settings.badge"),
      },
      {
        icon: Lock,
        title: t("admin.features.security.title"),
        description: t("admin.features.security.description"),
        badge: t("admin.features.security.badge"),
      },
      {
        icon: Bell,
        title: t("admin.features.notifications.title"),
        description: t("admin.features.notifications.description"),
        badge: t("admin.features.notifications.badge"),
      },
      {
        icon: Trophy,
        title: t("admin.features.rewards.title"),
        description: t("admin.features.rewards.description"),
        badge: t("admin.features.rewards.badge"),
      },
      {
        icon: Zap,
        title: t("admin.features.automation.title"),
        description: t("admin.features.automation.description"),
        badge: t("admin.features.automation.badge"),
      },
    ],
  };

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  return (
    <section className="relative py-16 md:py-24 overflow-hidden ">
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
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6">
        {/* Section Header */}
        <motion.div
          variants={headerVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-12 md:mb-16 space-y-4 md:space-y-6"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-3 rounded-full backdrop-blur-sm border"
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
          <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-tight px-4">
            <span className="theme-gradient-text">{t("title")}</span>
          </h2>

          {/* Description */}
          <p className="text-base md:text-lg lg:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed px-4">
            {t("description")}
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-12 md:mb-16 px-4">
          <LayoutGroup id="role-tabs">
            <div className="grid grid-cols-3 gap-1 sm:gap-2 rounded-2xl bg-white/5 backdrop-blur-xl p-1 shadow-2xl ring-1 ring-white/10 w-full max-w-2xl">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative rounded-xl px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 cursor-pointer transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="active-pill"
                        className="absolute inset-0 rounded-xl theme-gradient-bg"
                        style={{
                          boxShadow: `0 0 20px var(--color-primary-500)`,
                          opacity: 0.5,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}
                    <span
                      className={`relative z-10 flex items-center justify-center gap-2 font-bold text-sm md:text-base transition-colors ${
                        isActive ? "text-white" : "text-gray-400"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 md:w-5 md:h-5 transition-transform ${
                          isActive ? "animate-pulse scale-110" : ""
                        }`}
                      />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </LayoutGroup>
        </div>

        {/* Features Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
          >
            {features[activeTab].map((feature, index) => (
              <FeatureCard
                key={`${activeTab}-${index}`}
                feature={feature}
                index={index}
                t={t}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-12 md:mt-16 text-center px-4"
        >
          <CTACard activeTab={activeTab} t={t} icon={activeTabData.icon} />
        </motion.div>
      </div>
    </section>
  );
}

// Feature Card Component
function FeatureCard({ feature, index, t }) {
  const Icon = feature.icon;

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{
        y: -8,
        transition: { duration: 0.2 },
      }}
      className="group relative h-full"
    >
      {/* Card Container */}
      <div className="h-full bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6 transition-all duration-300 hover:shadow-2xl"
        style={{
          borderColor: `var(--color-primary-500)`,
          borderOpacity: 0.1,
        }}
      >
        {/* Hover Glow Effect */}
        <div 
          className="absolute -inset-0.5 theme-gradient-bg rounded-2xl opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-300" 
        />

        <div className="relative space-y-4 md:space-y-5">
          {/* Icon & Badge Row */}
          <div className="flex items-center justify-between">
            {/* Icon */}
            <motion.div
              whileHover={{
                rotate: [0, -10, 10, -10, 0],
                transition: { duration: 0.5 },
              }}
              className="relative w-14 h-14 md:w-16 md:h-16 theme-gradient-bg rounded-2xl flex items-center justify-center shadow-lg overflow-hidden"
            >
              <Icon className="w-7 h-7 md:w-8 md:h-8 text-white relative z-10" />
              {/* Shine Effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
              />
            </motion.div>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 + 0.2 }}
              className="px-2 md:px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
              style={{
                backgroundColor: `var(--color-primary-500)`,
                opacity: 0.2,
                color: `var(--color-primary-300)`,
              }}
            >
              {feature.badge}
            </motion.div>
          </div>

          {/* Content */}
          <div className="space-y-2 md:space-y-3">
            <h3 className="text-lg md:text-xl font-bold text-white group-hover:theme-gradient-text transition-all duration-300">
              {feature.title}
            </h3>
            <p className="text-xs md:text-sm text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
              {feature.description}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                {t("included")}
              </span>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1, x: 5 }}
              className="opacity-0 group-hover:opacity-100 transition-opacity rtl:rotate-180"
            >
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </motion.div>
          </div>
        </div>

        {/* Bottom Accent Line */}
        <div className="absolute bottom-0 ltr:left-0 rtl:right-0 ltr:right-0 rtl:left-0 h-1 theme-gradient-bg rounded-b-2xl scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ltr:origin-left rtl:origin-right" />
      </div>
    </motion.div>
  );
}

// CTA Card Component
function CTACard({ activeTab, t, icon: Icon }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="inline-flex flex-col md:flex-row items-center gap-4 md:gap-6 p-6 md:p-8 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-3xl border border-white/10 hover:shadow-2xl relative overflow-hidden group w-full max-w-4xl"
      style={{
        borderColor: `var(--color-primary-500)`,
        borderOpacity: 0.1,
      }}
    >
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 theme-gradient-bg opacity-0 group-hover:opacity-10 transition-opacity duration-300" />

      {/* Icon */}
      <motion.div
        whileHover={{
          rotate: 360,
          transition: { duration: 0.6 },
        }}
        className="relative w-16 h-16 md:w-20 md:h-20 theme-gradient-bg rounded-2xl flex items-center justify-center shadow-xl z-10 flex-shrink-0"
      >
        <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
      </motion.div>

      {/* Text Content */}
      <div className="text-center md:ltr:text-left md:rtl:text-right relative z-10 flex-grow">
        <p className="text-xl md:text-2xl lg:text-3xl font-black text-white mb-1">
          {t(`${activeTab}.cta.title`)}
        </p>
        <p className="text-gray-400 text-sm md:text-base">
          {t(`${activeTab}.cta.description`)}
        </p>
      </div>

      {/* CTA Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-full md:w-auto md:ltr:ml-auto md:rtl:mr-auto group/btn relative theme-gradient-bg text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg shadow-xl overflow-hidden z-10 flex-shrink-0"
        style={{
          boxShadow: `0 10px 40px var(--color-primary-500)`,
          opacity: 0.3,
        }}
      >
        {/* Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />

        <span className="relative flex items-center justify-center gap-2">
          {t(`${activeTab}.cta.button`)}
          <motion.div
            animate={{ x: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="rtl:rotate-180"
          >
            <ArrowRight className="w-5 h-5" />
          </motion.div>
        </span>
      </motion.button>
    </motion.div>
  );
}