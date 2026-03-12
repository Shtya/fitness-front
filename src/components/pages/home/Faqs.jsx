"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Sparkles,
  HelpCircle,
  Search,
  User,
  Dumbbell,
  CreditCard,
  Settings,
  Shield,
  Zap,
  Heart,
  TrendingUp,
  MessageSquare,
  Phone,
  Mail,
  Plus,
  Minus,
} from "lucide-react";

const PARTICLES = [
  { left: "7%", top: "13%", dur: 3, del: 0 },
  { left: "48%", top: "80%", dur: 4, del: 0.28 },
  { left: "89%", top: "47%", dur: 5, del: 0.56 },
  { left: "30%", top: "14%", dur: 3, del: 0.84 },
  { left: "71%", top: "81%", dur: 4, del: 1.12 },
  { left: "12%", top: "48%", dur: 5, del: 1.4 },
  { left: "53%", top: "15%", dur: 3, del: 1.68 },
  { left: "94%", top: "82%", dur: 4, del: 1.96 },
  { left: "35%", top: "49%", dur: 5, del: 0.24 },
  { left: "76%", top: "16%", dur: 3, del: 0.52 },
];

const FLOAT_ICONS = [
  { Icon: Sparkles, topClass: "top-[20%]", leftClass: "left-[12%]" },
  { Icon: Heart, topClass: "top-[35%]", leftClass: "left-[68%]" },
  { Icon: Zap, topClass: "top-[58%]", leftClass: "left-[18%]" },
  { Icon: Shield, topClass: "top-[72%]", leftClass: "left-[65%]" },
];

export default function FAQs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openIndex, setOpenIndex] = useState(null);
  const t = useTranslations("home.faqs");

  const categories = [
    { id: "all", label: t("categories.all"), icon: HelpCircle },
    { id: "general", label: t("categories.general"), icon: Sparkles },
    { id: "membership", label: t("categories.membership"), icon: User },
    { id: "training", label: t("categories.training"), icon: Dumbbell },
    { id: "billing", label: t("categories.billing"), icon: CreditCard },
    { id: "technical", label: t("categories.technical"), icon: Settings },
  ];

  const faqs = [
    {
      category: "general",
      icon: Sparkles,
      question: t("questions.general.0.question"),
      answer: t("questions.general.0.answer"),
    },
    {
      category: "general",
      icon: Heart,
      question: t("questions.general.1.question"),
      answer: t("questions.general.1.answer"),
    },
    {
      category: "general",
      icon: TrendingUp,
      question: t("questions.general.2.question"),
      answer: t("questions.general.2.answer"),
    },
    {
      category: "membership",
      icon: User,
      question: t("questions.membership.0.question"),
      answer: t("questions.membership.0.answer"),
    },
    {
      category: "membership",
      icon: Shield,
      question: t("questions.membership.1.question"),
      answer: t("questions.membership.1.answer"),
    },
    {
      category: "training",
      icon: Dumbbell,
      question: t("questions.training.0.question"),
      answer: t("questions.training.0.answer"),
    },
    {
      category: "billing",
      icon: CreditCard,
      question: t("questions.billing.0.question"),
      answer: t("questions.billing.0.answer"),
    },
    {
      category: "technical",
      icon: Settings,
      question: t("questions.technical.0.question"),
      answer: t("questions.technical.0.answer"),
    },
  ];

  const filtered = faqs.filter((f) => {
    const inCategory = activeCategory === "all" || f.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const inSearch =
      !q ||
      f.question.toLowerCase().includes(q) ||
      f.answer.toLowerCase().includes(q);
    return inCategory && inSearch;
  });

  const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section className="relative overflow-hidden py-20 sm:py-24 md:py-28 lg:py-32">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 h-[500px] w-[500px] rounded-full blur-3xl opacity-[0.13] ltr:right-20 rtl:left-20
          bg-[radial-gradient(circle,var(--color-primary-400),transparent)]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.2, 0.12] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 h-[500px] w-[500px] rounded-full blur-3xl opacity-[0.13] ltr:left-20 rtl:right-20
          bg-[radial-gradient(circle,var(--color-secondary-400),transparent)]"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.18, 0.12, 0.18] }}
          transition={{ duration: 8, repeat: Infinity, delay: 1 }}
        />

        <div
          className="absolute inset-0 opacity-[0.025]
          bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)]
          bg-[size:60px_60px]
          [mask-image:radial-gradient(ellipse_at_50%_50%,black_30%,transparent_80%)]"
        />

        {PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-[var(--color-primary-400)]"
            style={{ left: p.left, top: p.top }}
            animate={{ y: [0, -18, 0], opacity: [0, 0.45, 0], scale: [0, 1, 0] }}
            transition={{ duration: p.dur, repeat: Infinity, delay: p.del }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] px-6 lg:px-16">
        <div className="flex flex-col items-center">
          <h2 className="font-display mb-5 text-4xl leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="theme-gradient-text">{t("title")}</span>
          </h2>

          <p className="font-body mb-6 max-w-xl text-center text-base leading-relaxed text-white/55 md:text-lg">
            {t("description")}
          </p>

          <div className="relative mb-8 w-full max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-white/30 ltr:left-4 rtl:right-4" />
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setOpenIndex(null);
              }}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-lg border border-white/[0.08] bg-slate-800/40 py-3.5 text-sm text-white outline-none backdrop-blur-sm transition-colors placeholder:text-white/25 focus:border-[var(--color-primary-500)]/40 ltr:pl-11 ltr:pr-4 rtl:pl-4 rtl:pr-11"
            />
          </div>

          <div className="mb-8 flex flex-wrap gap-2">
            {categories.map((cat, idx) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;

              return (
                <motion.button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setOpenIndex(null);
                  }}
                  className={[
                    "relative flex items-center gap-1.5 overflow-hidden rounded-lg border-2 px-4 py-2 font-body text-xs font-bold transition-colors duration-200",
                    isActive
                      ? "border-transparent text-white"
                      : "border-slate-700/40 bg-slate-800/30 text-white/50 hover:border-slate-600/60 hover:text-white/80",
                  ].join(" ")}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.04 }}
                >
                  {isActive && (
                    <motion.div
                      className="theme-gradient-bg absolute inset-0"
                      layoutId="activeCategory"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon
                    className={`relative z-10 h-3.5 w-3.5 ${
                      isActive ? "animate-pulse" : ""
                    }`}
                  />
                  <span className="relative z-10">{cat.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">
          <motion.div
            className="lg:col-span-7"
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filtered.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="py-16 text-center"
                  >
                    <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
                      <Search className="h-9 w-9 text-white/25" />
                    </div>
                    <h3 className="font-body mb-2 text-2xl font-black text-white">
                      {t("noResults.title")}
                    </h3>
                    <p className="font-body text-white/45">
                      {t("noResults.description")}
                    </p>
                  </motion.div>
                ) : (
                  filtered.map((faq, index) => {
                    const isOpen = openIndex === index;

                    return (
                      <motion.div
                        key={`${activeCategory}-${index}`}
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <motion.button
                          onClick={() => toggle(index)}
                          className="group w-full text-left"
                          whileTap={{ scale: 0.995 }}
                        >
                          <div
                            className={[
                              "relative overflow-hidden rounded-lg border-2 bg-slate-800/45 p-5 backdrop-blur-xl transition-all duration-300 sm:p-6",
                              isOpen
                                ? "border-[var(--color-primary-500)]/60 shadow-[0_0_32px_rgba(99,102,241,0.15)]"
                                : "border-slate-700/35 hover:border-[var(--color-primary-500)]/30",
                            ].join(" ")}
                          >
                            {isOpen && (
                              <motion.div
                                className="theme-gradient-bg pointer-events-none absolute inset-0 opacity-[0.04]"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.04 }}
                              />
                            )}

                            <div className="relative flex items-start justify-between gap-4">
                              <h3
                                className={[
                                  "font-body flex-1 text-base font-bold leading-snug transition-colors duration-200 ltr:pr-2 rtl:pl-2",
                                  isOpen
                                    ? "text-[var(--color-primary-200)]"
                                    : "text-white group-hover:text-[var(--color-primary-200)]",
                                ].join(" ")}
                              >
                                {faq.question}
                              </h3>

                              <motion.div
                                className={[
                                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
                                  isOpen
                                    ? "theme-gradient-bg"
                                    : "bg-slate-700/60 group-hover:bg-slate-600/60",
                                ].join(" ")}
                                animate={{ rotate: isOpen ? 180 : 0 }}
                                transition={{ duration: 0.25 }}
                              >
                                {isOpen ? (
                                  <Minus className="h-4 w-4 text-white" strokeWidth={3} />
                                ) : (
                                  <Plus className="h-4 w-4 text-white/60" strokeWidth={3} />
                                )}
                              </motion.div>
                            </div>

                            <AnimatePresence>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                  animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                  transition={{
                                    duration: 0.28,
                                    ease: [0.22, 1, 0.36, 1],
                                  }}
                                  className="overflow-hidden"
                                >
                                  <div className="border-[var(--color-primary-500)]/30 ltr:border-l-2 ltr:pl-4 rtl:border-r-2 rtl:pr-4">
                                    <motion.p
                                      initial={{ y: -8 }}
                                      animate={{ y: 0 }}
                                      className="font-body text-sm leading-relaxed text-white/60"
                                    >
                                      {faq.answer}
                                    </motion.p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.button>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>

            <motion.div
              className="relative mt-10"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <motion.div
                className="theme-gradient-bg absolute -inset-4 -z-10 rounded-lg opacity-20 blur-2xl"
                animate={{ opacity: [0.18, 0.28, 0.18] }}
                transition={{ duration: 3, repeat: Infinity }}
              />

              <div className="relative rounded-lg border border-[var(--color-primary-500)]/25 bg-slate-800/55 p-7 backdrop-blur-xl">
                <div className="flex flex-col items-center gap-6 sm:flex-row">
                  <motion.div
                    className="theme-gradient-bg flex h-14 w-14 shrink-0 items-center justify-center rounded-lg shadow-xl"
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.55 }}
                  >
                    <MessageSquare className="h-7 w-7 text-white" />
                  </motion.div>

                  <div className="flex-1 text-center sm:ltr:text-left sm:rtl:text-right">
                    <h3 className="font-body mb-1 text-xl font-black text-white">
                      {t("cta.title")}
                    </h3>
                    <p className="font-body text-sm text-white/45">
                      {t("cta.description")}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-3">
                    <motion.button
                      className="theme-gradient-bg group relative flex items-center gap-2 overflow-hidden rounded-lg px-5 py-3 font-body text-sm font-bold text-white shadow-[0_6px_24px_rgba(99,102,241,0.3)]"
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      <motion.div
                        className="absolute inset-0 bg-white/20"
                        initial={{ x: "-100%" }}
                        whileHover={{ x: "100%" }}
                        transition={{ duration: 0.55 }}
                      />
                      <Mail className="relative z-10 h-4 w-4" />
                      <span className="relative z-10">{t("cta.email")}</span>
                    </motion.button>

                    <motion.button
                      className="flex items-center gap-2 rounded-lg border-2 border-slate-600/50 bg-slate-700/30 px-5 py-3 font-body text-sm font-bold text-white/70 transition-colors duration-200 hover:border-[var(--color-primary-500)]/50 hover:text-white"
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      <Phone className="h-4 w-4" />
                      {t("cta.call")}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            className="lg:sticky lg:top-8 lg:col-span-5 lg:self-start"
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <div
              className="relative aspect-square w-full overflow-hidden rounded-lg border border-[var(--color-primary-500)]/20
              bg-[linear-gradient(135deg,rgba(30,41,59,0.2),rgba(15,23,42,0.2))]"
            >
              <motion.div
                className="theme-gradient-bg absolute -inset-[1px] -z-10 rounded-lg blur-lg"
                animate={{ opacity: [0.18, 0.32, 0.18] }}
                transition={{ duration: 4, repeat: Infinity }}
              />

              {[180, 260, 340].map((size, i) => (
                <motion.div
                  key={i}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[var(--color-primary-500)]/[0.12]"
                  style={{ width: size, height: size }}
                  animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                  transition={{
                    duration: 18 + i * 6,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              ))}

              <motion.div
                className="theme-gradient-bg absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg shadow-2xl"
                animate={{ scale: [1, 1.06, 1], rotate: [0, 4, -4, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <HelpCircle className="h-14 w-14 text-white" strokeWidth={1.5} />
              </motion.div>

              {FLOAT_ICONS.map(({ Icon, topClass, leftClass }, i) => (
                <motion.div
                  key={i}
                  className={`theme-gradient-bg absolute flex h-12 w-12 items-center justify-center rounded-lg shadow-lg ${topClass} ${leftClass}`}
                  animate={{ y: [0, -14, 0], rotate: [0, 360] }}
                  transition={{
                    y: {
                      duration: 3 + i,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.5,
                    },
                    rotate: {
                      duration: 6 + i,
                      repeat: Infinity,
                      ease: "linear",
                      delay: i * 0.5,
                    },
                  }}
                >
                  <Icon className="h-6 w-6 text-white" />
                </motion.div>
              ))}

              <motion.div
                className="absolute bottom-6 flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-slate-900/80 px-4 py-2.5 shadow-xl backdrop-blur-sm ltr:left-6 rtl:right-6"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
              >
                <div className="theme-gradient-bg flex h-8 w-8 items-center justify-center rounded-lg">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-body text-xs font-black leading-none text-white">
                    {t("badge")}
                  </p>
                  <p className="mt-0.5 font-body text-[10px] text-white/40">
                    24/7
                  </p>
                </div>
              </motion.div>

              <motion.div
                className="absolute top-6 flex items-center gap-2 rounded-lg border border-white/[0.08] bg-slate-900/80 px-3.5 py-2 shadow-xl backdrop-blur-sm ltr:right-6 rtl:left-6"
                initial={{ opacity: 0, y: -12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.7 }}
              >
                <span className="font-display text-xl leading-none text-[var(--color-primary-400)]">
                  {faqs.length}+
                </span>
                <span className="max-w-[48px] font-body text-[10px] leading-tight text-white/40">
                  {t("questionsCount")}
                </span>
              </motion.div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {categories
                .filter((c) => c.id !== "all")
                .slice(0, 3)
                .map((cat) => {
                  const count = faqs.filter((f) => f.category === cat.id).length;
                  const Icon = cat.icon;

                  return (
                    <motion.button
                      key={cat.id}
                      onClick={() => {
                        setActiveCategory(cat.id);
                        setOpenIndex(null);
                      }}
                      className={[
                        "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all duration-200",
                        activeCategory === cat.id
                          ? "theme-gradient-bg border-transparent shadow-lg"
                          : "border-white/[0.06] bg-slate-800/40 hover:border-[var(--color-primary-500)]/30",
                      ].join(" ")}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Icon
                        className={`h-5 w-5 ${
                          activeCategory === cat.id
                            ? "text-white"
                            : "text-[var(--color-primary-400)]"
                        }`}
                      />
                      <span
                        className={`font-display text-xl leading-none ${
                          activeCategory === cat.id
                            ? "text-white"
                            : "theme-gradient-text"
                        }`}
                      >
                        {count}
                      </span>
                      <span
                        className={`font-body text-[10px] font-bold uppercase tracking-wide ${
                          activeCategory === cat.id
                            ? "text-white/70"
                            : "text-white/35"
                        }`}
                      >
                        {cat.label}
                      </span>
                    </motion.button>
                  );
                })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}