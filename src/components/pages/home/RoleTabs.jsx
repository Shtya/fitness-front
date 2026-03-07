"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useTheme } from "@/app/[locale]/theme";
import {
  User, Dumbbell, Shield, Calendar, TrendingUp,
  Heart, Users, ClipboardList, BarChart3, Settings,
  Award, Target, Activity, MessageSquare, FileText,
  Lock, Zap, Trophy, Video, BookOpen, DollarSign,
  UserCheck, Bell, Database, CheckCircle2, ArrowRight, Sparkles,
} from "lucide-react";

// ─── NOTE ON INLINE STYLES ────────────────────────────────────────────────────
// var(--color-primary-*) and var(--color-secondary-*) are CSS custom properties
// set at runtime by the theme system. Tailwind can read them as arbitrary values:
//   bg-[var(--color-primary-500)]   text-[var(--color-primary-300)]  etc.
// We use this pattern everywhere. The only remaining style={} usages are for
// dynamic boxShadow strings (no Tailwind equivalent for custom glow values).
// ─────────────────────────────────────────────────────────────────────────────

// ─── Animation variants ───────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
  exit:   { opacity: 0, transition: { staggerChildren: 0.03, staggerDirection: -1 } },
};

const cardVariants = {
  hidden:  { opacity: 0, scale: 0.85, y: 20 },
  visible: { opacity: 1, scale: 1,    y: 0,  transition: { type: "spring", stiffness: 100, damping: 15 } },
  exit:    { opacity: 0, scale: 0.85, y: -20, transition: { duration: 0.18 } },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RoleTabsFinal() {
  const [activeTab, setActiveTab] = useState("client");
  const t = useTranslations("home.roles");

  const tabs = [
    { id: "client", label: t("tabs.client"), icon: User    },
    { id: "coach",  label: t("tabs.coach"),  icon: Dumbbell },
    { id: "admin",  label: t("tabs.admin"),  icon: Shield  },
  ];

  const features = {
    client: [
      { icon: Calendar,     title: t("client.features.schedule.title"),    description: t("client.features.schedule.description"),    badge: t("client.features.schedule.badge")    },
      { icon: Activity,     title: t("client.features.tracking.title"),    description: t("client.features.tracking.description"),    badge: t("client.features.tracking.badge")    },
      { icon: Video,        title: t("client.features.tutorials.title"),   description: t("client.features.tutorials.description"),   badge: t("client.features.tutorials.badge")   },
      { icon: TrendingUp,   title: t("client.features.progress.title"),    description: t("client.features.progress.description"),    badge: t("client.features.progress.badge")    },
      { icon: Heart,        title: t("client.features.health.title"),      description: t("client.features.health.description"),      badge: t("client.features.health.badge")      },
      { icon: MessageSquare,title: t("client.features.chat.title"),        description: t("client.features.chat.description"),        badge: t("client.features.chat.badge")        },
      { icon: Target,       title: t("client.features.goals.title"),       description: t("client.features.goals.description"),       badge: t("client.features.goals.badge")       },
      { icon: BookOpen,     title: t("client.features.nutrition.title"),   description: t("client.features.nutrition.description"),   badge: t("client.features.nutrition.badge")   },
    ],
    coach: [
      { icon: Users,        title: t("coach.features.clients.title"),       description: t("coach.features.clients.description"),       badge: t("coach.features.clients.badge")       },
      { icon: ClipboardList,title: t("coach.features.plans.title"),         description: t("coach.features.plans.description"),         badge: t("coach.features.plans.badge")         },
      { icon: BarChart3,    title: t("coach.features.analytics.title"),     description: t("coach.features.analytics.description"),     badge: t("coach.features.analytics.badge")     },
      { icon: Calendar,     title: t("coach.features.scheduling.title"),    description: t("coach.features.scheduling.description"),    badge: t("coach.features.scheduling.badge")    },
      { icon: Award,        title: t("coach.features.certifications.title"),description: t("coach.features.certifications.description"),badge: t("coach.features.certifications.badge") },
      { icon: MessageSquare,title: t("coach.features.messaging.title"),     description: t("coach.features.messaging.description"),     badge: t("coach.features.messaging.badge")     },
      { icon: FileText,     title: t("coach.features.reports.title"),       description: t("coach.features.reports.description"),       badge: t("coach.features.reports.badge")       },
      { icon: DollarSign,   title: t("coach.features.earnings.title"),      description: t("coach.features.earnings.description"),      badge: t("coach.features.earnings.badge")      },
    ],
    admin: [
      { icon: Database,  title: t("admin.features.management.title"),    description: t("admin.features.management.description"),    badge: t("admin.features.management.badge")    },
      { icon: UserCheck, title: t("admin.features.verification.title"),  description: t("admin.features.verification.description"),  badge: t("admin.features.verification.badge")  },
      { icon: BarChart3, title: t("admin.features.reporting.title"),     description: t("admin.features.reporting.description"),     badge: t("admin.features.reporting.badge")     },
      { icon: Settings,  title: t("admin.features.settings.title"),      description: t("admin.features.settings.description"),      badge: t("admin.features.settings.badge")      },
      { icon: Lock,      title: t("admin.features.security.title"),      description: t("admin.features.security.description"),      badge: t("admin.features.security.badge")      },
      { icon: Bell,      title: t("admin.features.notifications.title"), description: t("admin.features.notifications.description"), badge: t("admin.features.notifications.badge") },
      { icon: Trophy,    title: t("admin.features.rewards.title"),       description: t("admin.features.rewards.description"),       badge: t("admin.features.rewards.badge")       },
      { icon: Zap,       title: t("admin.features.automation.title"),    description: t("admin.features.automation.description"),    badge: t("admin.features.automation.badge")    },
    ],
  };

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  return (
    <section className="relative py-16 md:py-24 overflow-hidden">

      {/* ── Background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Orb 1 */}
        <motion.div
          className="absolute top-10 md:top-20
            ltr:right-10 rtl:left-10 ltr:md:right-20 rtl:md:left-20
            w-64 md:w-96 h-64 md:h-96 rounded-full blur-3xl opacity-20
            bg-[radial-gradient(circle,var(--color-primary-500)_0%,transparent_70%)]"
          animate={{ opacity:[0.15,0.3,0.15], scale:[0.8,1.2,0.8] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Orb 2 */}
        <motion.div
          className="absolute bottom-10 md:bottom-20
            ltr:left-10 rtl:right-10 ltr:md:left-20 rtl:md:right-20
            w-64 md:w-96 h-64 md:h-96 rounded-full blur-3xl opacity-20
            bg-[radial-gradient(circle,var(--color-secondary-500)_0%,transparent_70%)]"
          animate={{ opacity:[0.15,0.3,0.15], scale:[0.8,1.2,0.8] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
        {/* Fine grid */}
        <div className="absolute inset-0
          bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)]
          bg-[size:100px_100px]
          [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)]" />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-16">

        {/* ── Section header ── */}
        <motion.div
          className="text-center mb-12 md:mb-16 space-y-4 md:space-y-5"
          initial={{ opacity: 0, y: -28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          {/* Badge — fixed: opacity was being applied to the gradient background,
              making it invisible. Now the bg is a low-opacity fill + visible border. */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full
            border border-[var(--color-primary-500)]/30
            bg-[var(--color-primary-500)]/[0.08] backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-[var(--color-primary-400)] animate-pulse" />
            <span className="font-body text-xs font-bold uppercase tracking-[0.14em]
              text-[var(--color-primary-300)]">
              {t("badge")}
            </span>
          </div>

          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl xl:text-7xl
            leading-tight px-4">
            <span className="theme-gradient-text">{t("title")}</span>
          </h2>

          <p className="font-body text-base md:text-lg text-white/55
            max-w-2xl mx-auto leading-relaxed px-4">
            {t("description")}
          </p>
        </motion.div>

        {/* ── Tab switcher ── */}
        <div className="flex justify-center mb-10 md:mb-14 px-4">
          <LayoutGroup id="role-tabs">
            <div className="grid grid-cols-3 gap-1 sm:gap-1.5 rounded-xl
              bg-white/[0.04] backdrop-blur-xl p-1.5
              shadow-2xl ring-1 ring-white/[0.08]
              w-full max-w-xl">
              {tabs.map((tab) => {
                const Icon     = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative rounded-[10px] px-3 sm:px-5 py-2.5 sm:py-3.5
                      cursor-pointer transition-colors duration-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {/* Sliding active pill */}
                    {isActive && (
                      <motion.span
                        layoutId="active-pill"
                        className="absolute inset-0 rounded-[10px] theme-gradient-bg"
                        style={{ boxShadow: "0 0 18px var(--color-primary-500)" }}
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className={[
                      "relative z-10 flex items-center justify-center gap-2",
                      "font-body font-bold text-sm sm:text-base transition-colors duration-200",
                      isActive ? "text-white" : "text-white/40 hover:text-white/70",
                    ].join(" ")}>
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform duration-200
                        ${isActive ? "scale-110" : ""}`} />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </LayoutGroup>
        </div>

        {/* ── Feature cards grid ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5"
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

        {/* ── CTA strip ── */}
        <motion.div
          className="mt-10 md:mt-14 flex justify-center px-4"
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
function FeatureCard({ feature, index, t }) {
  const Icon = feature.icon;

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -7, transition: { duration: 0.18 } }}
      className="group relative h-full"
    >
      {/* Outer glow on hover */}
      <div className="absolute -inset-[1px] rounded-2xl theme-gradient-bg
        opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300 -z-10" />

      {/* Card */}
      <div className="relative h-full flex flex-col
        bg-white/[0.04] backdrop-blur-sm
        border border-white/[0.08] group-hover:border-[var(--color-primary-500)]/30
        rounded-2xl p-5 md:p-6
        transition-colors duration-300
        shadow-[0_4px_16px_rgba(0,0,0,0.25)]
        group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)]
        overflow-hidden">

        {/* Shimmer sweep */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04]
          to-transparent -translate-x-full group-hover:translate-x-full
          transition-transform duration-700 pointer-events-none" />

        <div className="relative flex flex-col h-full space-y-4">

          {/* Icon + badge row */}
          <div className="flex items-start justify-between gap-3">
            {/* Icon */}
            <motion.div
              className="relative w-13 h-13 md:w-14 md:h-14 theme-gradient-bg
                rounded-xl flex items-center justify-center shadow-lg shrink-0 overflow-hidden"
              whileHover={{ rotate: [0,-8,8,-6,0], transition: { duration: 0.5 } }}
            >
              <Icon className="w-6 h-6 md:w-7 md:h-7 text-white relative z-10" />
              {/* Inner shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30
                to-transparent -translate-x-full group-hover:translate-x-full
                transition-transform duration-700" />
            </motion.div>

            {/* Badge — fixed: was applying opacity to background which hid it */}
            <span className="shrink-0 px-2.5 py-1 rounded-full
              font-body text-[10px] font-bold uppercase tracking-[0.1em]
              bg-[var(--color-primary-500)]/[0.12]
              text-[var(--color-primary-300)]
              border border-[var(--color-primary-500)]/20
              mt-0.5">
              {feature.badge}
            </span>
          </div>

          {/* Title + description */}
          <div className="flex-1 space-y-2">
            <h3 className="font-body text-base md:text-lg font-black text-white
              group-hover:text-[var(--color-primary-200)] transition-colors duration-200 leading-tight">
              {feature.title}
            </h3>
            <p className="font-body text-xs md:text-sm text-white/40
              group-hover:text-white/60 transition-colors leading-relaxed">
              {feature.description}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3
            border-t border-white/[0.06]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-body text-[10px] text-white/35 font-bold uppercase tracking-[0.1em]">
                {t("included")}
              </span>
            </div>
            <motion.div
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              animate={{ x: [0,4,0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight className="w-4 h-4 text-[var(--color-primary-400)] rtl:rotate-180" />
            </motion.div>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px]
          theme-gradient-bg rounded-b-2xl
          scale-x-0 group-hover:scale-x-100
          transition-transform duration-300
          ltr:origin-left rtl:origin-right" />
      </div>
    </motion.div>
  );
}

// ─── CTA Card ─────────────────────────────────────────────────────────────────
function CTACard({ activeTab, t, icon: Icon }) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="group relative w-full max-w-4xl
        flex flex-col md:flex-row items-center gap-5 md:gap-8
        p-6 md:p-8
        bg-white/[0.03] backdrop-blur-xl
        border border-white/[0.08] group-hover:border-[var(--color-primary-500)]/30
        rounded-2xl overflow-hidden
        transition-colors duration-300
        shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
    >
      {/* Hover tint */}
      <div className="absolute inset-0 theme-gradient-bg opacity-0
        group-hover:opacity-[0.06] transition-opacity duration-300 pointer-events-none" />

      {/* Icon */}
      <motion.div
        whileHover={{ rotate: 360, transition: { duration: 0.55 } }}
        className="relative w-16 h-16 md:w-20 md:h-20
          theme-gradient-bg rounded-2xl flex items-center justify-center
          shadow-xl shrink-0 z-10"
      >
        <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
      </motion.div>

      {/* Text */}
      <div className="flex-1 text-center md:ltr:text-left md:rtl:text-right relative z-10">
        <p className="font-body text-xl md:text-2xl font-black text-white mb-1 leading-tight">
          {t(`${activeTab}.cta.title`)}
        </p>
        <p className="font-body text-sm text-white/45">
          {t(`${activeTab}.cta.description`)}
        </p>
      </div>

      {/* CTA button — fixed: was applying opacity 0.3 to boxShadow via style= */}
      <motion.button
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.97 }}
        className="group/btn relative w-full md:w-auto shrink-0
          theme-gradient-bg text-white
          px-7 md:px-8 py-3.5 md:py-4
          rounded-xl font-body font-bold text-base
          shadow-[0_8px_32px_var(--color-primary-500)/30]
          hover:shadow-[0_12px_40px_var(--color-primary-500)/50]
          overflow-hidden z-10
          transition-shadow duration-200"
      >
        {/* Shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25
          to-transparent -translate-x-full group-hover/btn:translate-x-full
          transition-transform duration-600 pointer-events-none" />
        <span className="relative flex items-center justify-center gap-2">
          {t(`${activeTab}.cta.button`)}
          <motion.span
            animate={{ x: [0,4,0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="rtl:rotate-180"
          >
            <ArrowRight className="w-5 h-5" />
          </motion.span>
        </span>
      </motion.button>
    </motion.div>
  );
}