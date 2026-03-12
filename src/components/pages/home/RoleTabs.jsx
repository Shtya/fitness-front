"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
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

// ─── Animation variants ───────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.03, staggerDirection: -1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    y: -20,
    transition: { duration: 0.18 },
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RoleTabsFinal() {
  const [activeTab, setActiveTab] = useState("client");
  const t = useTranslations("home.roles");

  const tabs = [
    { id: "client", label: t("tabs.client"), icon: User },
    { id: "coach", label: t("tabs.coach"), icon: Dumbbell },
    { id: "admin", label: t("tabs.admin"), icon: Shield },
  ];

  const features = {
    client: [
      {
        icon: Calendar,
        title: t("client.features.workouts.title"),
        description: t("client.features.workouts.description"),
        badge: t("client.features.workouts.badge"),
      },
      {
        icon: Activity,
        title: t("client.features.nutrition.title"),
        description: t("client.features.nutrition.description"),
        badge: t("client.features.nutrition.badge"),
      },
      {
        icon: Video,
        title: t("client.features.exercises.title"),
        description: t("client.features.exercises.description"),
        badge: t("client.features.exercises.badge"),
      },
      {
        icon: TrendingUp,
        title: t("client.features.progress.title"),
        description: t("client.features.progress.description"),
        badge: t("client.features.progress.badge"),
      },
      {
        icon: Heart,
        title: t("client.features.reports.title"),
        description: t("client.features.reports.description"),
        badge: t("client.features.reports.badge"),
      },
      {
        icon: MessageSquare,
        title: t("client.features.chat.title"),
        description: t("client.features.chat.description"),
        badge: t("client.features.chat.badge"),
      },
      {
        icon: Target,
        title: t("client.features.reminders.title"),
        description: t("client.features.reminders.description"),
        badge: t("client.features.reminders.badge"),
      },
      {
        icon: BookOpen,
        title: t("client.features.recipes.title"),
        description: t("client.features.recipes.description"),
        badge: t("client.features.recipes.badge"),
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
        title: t("coach.features.workoutPlans.title"),
        description: t("coach.features.workoutPlans.description"),
        badge: t("coach.features.workoutPlans.badge"),
      },
      {
        icon: BarChart3,
        title: t("coach.features.nutritionPlans.title"),
        description: t("coach.features.nutritionPlans.description"),
        badge: t("coach.features.nutritionPlans.badge"),
      },
      {
        icon: Calendar,
        title: t("coach.features.reports.title"),
        description: t("coach.features.reports.description"),
        badge: t("coach.features.reports.badge"),
      },
      {
        icon: Award,
        title: t("coach.features.exerciseLibrary.title"),
        description: t("coach.features.exerciseLibrary.description"),
        badge: t("coach.features.exerciseLibrary.badge"),
      },
      {
        icon: MessageSquare,
        title: t("coach.features.chat.title"),
        description: t("coach.features.chat.description"),
        badge: t("coach.features.chat.badge"),
      },
      {
        icon: FileText,
        title: t("coach.features.forms.title"),
        description: t("coach.features.forms.description"),
        badge: t("coach.features.forms.badge"),
      },
      {
        icon: DollarSign,
        title: t("coach.features.sharedTools.title"),
        description: t("coach.features.sharedTools.description"),
        badge: t("coach.features.sharedTools.badge"),
      },
    ],
    admin: [
      {
        icon: Database,
        title: t("admin.features.dashboard.title"),
        description: t("admin.features.dashboard.description"),
        badge: t("admin.features.dashboard.badge"),
      },
      {
        icon: UserCheck,
        title: t("admin.features.users.title"),
        description: t("admin.features.users.description"),
        badge: t("admin.features.users.badge"),
      },
      {
        icon: BarChart3,
        title: t("admin.features.billing.title"),
        description: t("admin.features.billing.description"),
        badge: t("admin.features.billing.badge"),
      },
      {
        icon: Settings,
        title: t("admin.features.plans.title"),
        description: t("admin.features.plans.description"),
        badge: t("admin.features.plans.badge"),
      },
      {
        icon: Lock,
        title: t("admin.features.forms.title"),
        description: t("admin.features.forms.description"),
        badge: t("admin.features.forms.badge"),
      },
      {
        icon: Bell,
        title: t("admin.features.reports.title"),
        description: t("admin.features.reports.description"),
        badge: t("admin.features.reports.badge"),
      },
      {
        icon: Trophy,
        title: t("admin.features.content.title"),
        description: t("admin.features.content.description"),
        badge: t("admin.features.content.badge"),
      },
      {
        icon: Zap,
        title: t("admin.features.operations.title"),
        description: t("admin.features.operations.description"),
        badge: t("admin.features.operations.badge"),
      },
    ],
  };

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-10 h-64 w-64 rounded-full blur-3xl opacity-20 ltr:right-10 rtl:left-10 md:top-20 md:h-96 md:w-96 ltr:md:right-20 rtl:md:left-20
          bg-[radial-gradient(circle,var(--color-primary-500)_0%,transparent_70%)]"
          animate={{ opacity: [0.15, 0.3, 0.15], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="absolute bottom-10 h-64 w-64 rounded-full blur-3xl opacity-20 ltr:left-10 rtl:right-10 md:bottom-20 md:h-96 md:w-96 ltr:md:left-20 rtl:md:right-20
          bg-[radial-gradient(circle,var(--color-secondary-500)_0%,transparent_70%)]"
          animate={{ opacity: [0.15, 0.3, 0.15], scale: [0.8, 1.2, 0.8] }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />

        <div
          className="absolute inset-0
          bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)]
          bg-[size:100px_100px]
          [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)]"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] px-6 lg:px-16">
        <motion.div
          className="mb-12 space-y-4 text-center md:mb-16 md:space-y-5"
          initial={{ opacity: 0, y: -28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          <div
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary-500)]/30
            bg-[var(--color-primary-500)]/[0.08] px-5 py-2.5 backdrop-blur-sm"
          >
            <Sparkles className="h-4 w-4 animate-pulse text-[var(--color-primary-400)]" />
            <span
              className="font-body text-xs font-bold uppercase tracking-[0.14em]
              text-[var(--color-primary-300)]"
            >
              {t("badge")}
            </span>
          </div>

          <h2 className="font-display px-4 text-4xl leading-tight md:text-5xl lg:text-6xl xl:text-7xl">
            <span className="theme-gradient-text">{t("title")}</span>
          </h2>

          <p className="font-body mx-auto max-w-2xl px-4 text-base leading-relaxed text-white/55 md:text-lg">
            {t("description")}
          </p>
        </motion.div>

        <div className="mb-10 flex justify-center px-4 md:mb-14">
          <LayoutGroup id="role-tabs">
            <div
              className="grid w-full max-w-xl grid-cols-3 gap-1 rounded-lg bg-white/[0.04] p-1.5 shadow-2xl ring-1 ring-white/[0.08]
              backdrop-blur-xl sm:gap-1.5"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative cursor-pointer rounded-[10px] px-3 py-2.5 transition-colors duration-200 sm:px-5 sm:py-3.5"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="active-pill"
                        className="theme-gradient-bg absolute inset-0 rounded-[10px] shadow-[0_0_18px_rgba(99,102,241,0.35)]"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 32,
                        }}
                      />
                    )}

                    <span
                      className={[
                        "relative z-10 flex items-center justify-center gap-2 font-body text-sm font-bold transition-colors duration-200 sm:text-base",
                        isActive
                          ? "text-white"
                          : "text-white/40 hover:text-white/70",
                      ].join(" ")}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-transform duration-200 sm:h-5 sm:w-5 ${
                          isActive ? "scale-110" : ""
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

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-4"
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

        <motion.div
          className="mt-10 flex justify-center px-4 md:mt-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <CTACard activeTab={activeTab} t={t} icon={activeTabData.icon} />
        </motion.div>
      </div>
    </section>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ feature, t }) {
  const Icon = feature.icon;

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -7, transition: { duration: 0.18 } }}
      className="group relative h-full"
    >
      <div
        className="theme-gradient-bg absolute -inset-[1px] -z-10 rounded-lg opacity-0 blur-xl transition-opacity duration-300
        group-hover:opacity-20"
      />

      <div
        className="relative flex h-full flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04] p-5
        shadow-[0_4px_16px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-colors duration-300
        group-hover:border-[var(--color-primary-500)]/30 group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] md:p-6"
      >
        <div
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent
          transition-transform duration-700 group-hover:translate-x-full"
        />

        <div className="relative flex h-full flex-col space-y-4">
          <div className="flex items-start justify-between gap-3">
            <motion.div
              className="theme-gradient-bg relative flex h-13 w-13 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-lg md:h-14 md:w-14"
              whileHover={{
                rotate: [0, -8, 8, -6, 0],
                transition: { duration: 0.5 },
              }}
            >
              <Icon className="relative z-10 h-6 w-6 text-white md:h-7 md:w-7" />
              <div
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent
                transition-transform duration-700 group-hover:translate-x-full"
              />
            </motion.div>

            <span
              className="mt-0.5 shrink-0 rounded-full border border-[var(--color-primary-500)]/20 bg-[var(--color-primary-500)]/[0.12]
              px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-primary-300)]"
            >
              {feature.badge}
            </span>
          </div>

          <div className="flex-1 space-y-2">
            <h3
              className="font-body text-base font-black leading-tight text-white transition-colors duration-200
              group-hover:text-[var(--color-primary-200)] md:text-lg"
            >
              {feature.title}
            </h3>
            <p className="font-body text-xs leading-relaxed text-white/40 transition-colors group-hover:text-white/60 md:text-sm">
              {feature.description}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span className="font-body text-[10px] font-bold uppercase tracking-[0.1em] text-white/35">
                {t("included")}
              </span>
            </div>

            <motion.div
              className="opacity-0 transition-opacity group-hover:opacity-100"
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight className="h-4 w-4 text-[var(--color-primary-400)] rtl:rotate-180" />
            </motion.div>
          </div>
        </div>

        <div
          className="theme-gradient-bg absolute bottom-0 left-0 right-0 h-[3px] scale-x-0 rounded-b-2xl transition-transform duration-300
          group-hover:scale-x-100 ltr:origin-left rtl:origin-right"
        />
      </div>
    </motion.div>
  );
}

// ─── CTA Card ─────────────────────────────────────────────────────────────────
function CTACard({ activeTab, t, icon: Icon }) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="group relative flex w-full max-w-4xl flex-col items-center gap-5 overflow-hidden rounded-lg border border-white/[0.08]
      bg-white/[0.03] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-colors duration-300
      group-hover:border-[var(--color-primary-500)]/30 md:flex-row md:gap-8 md:p-8"
    >
      <div className="theme-gradient-bg pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-[0.06]" />

      <motion.div
        whileHover={{ rotate: 360, transition: { duration: 0.55 } }}
        className="theme-gradient-bg relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-lg shadow-xl md:h-20 md:w-20"
      >
        <Icon className="h-8 w-8 text-white md:h-10 md:w-10" />
      </motion.div>

      <div className="relative z-10 flex-1 text-center md:ltr:text-left md:rtl:text-right">
        <p className="mb-1 font-body text-xl font-black leading-tight text-white md:text-2xl">
          {t(`${activeTab}.cta.title`)}
        </p>
        <p className="font-body text-sm text-white/45">
          {t(`${activeTab}.cta.description`)}
        </p>
      </div>

      <motion.button
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.97 }}
        className="theme-gradient-bg group/btn relative z-10 w-full shrink-0 overflow-hidden rounded-lg px-7 py-3.5 font-body text-base font-bold text-white
        shadow-[0_8px_32px_rgba(99,102,241,0.3)] transition-shadow duration-200
        hover:shadow-[0_12px_40px_rgba(99,102,241,0.5)] md:w-auto md:px-8 md:py-4"
      >
        <div
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent
          transition-transform duration-700 group-hover/btn:translate-x-full"
        />
        <span className="relative flex items-center justify-center gap-2">
          {t(`${activeTab}.cta.button`)}
          <motion.span
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="rtl:rotate-180"
          >
            <ArrowRight className="h-5 w-5" />
          </motion.span>
        </span>
      </motion.button>
    </motion.div>
  );
}