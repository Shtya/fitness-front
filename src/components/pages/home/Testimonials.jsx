"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Star, Quote, ChevronLeft, ChevronRight, Heart, TrendingUp, Trophy } from "lucide-react";

// ─── Stable avatar gradient classes per index ─────────────────────────────────
const AVATAR_GRADIENTS = [
  "from-[var(--color-primary-500)] to-[var(--color-secondary-600)]",
  "from-[var(--color-secondary-500)] to-[var(--color-primary-600)]",
  "from-[var(--color-primary-400)] to-[var(--color-primary-700)]",
  "from-[var(--color-secondary-400)] to-[var(--color-secondary-700)]",
];

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction,   setDirection]   = useState(0);
  const [paused,      setPaused]      = useState(false);
  const t = useTranslations("home.testimonials");

  const testimonials = [
    {
      id: 1,
      name:        t("items.0.name"),
      role:        t("items.0.role"),
      rating:      5,
      text:        t("items.0.text"),
      achievement: t("items.0.achievement"),
    },
    {
      id: 2,
      name:        t("items.1.name"),
      role:        t("items.1.role"),
      rating:      5,
      text:        t("items.1.text"),
      achievement: t("items.1.achievement"),
    },
    {
      id: 3,
      name:        t("items.2.name"),
      role:        t("items.2.role"),
      rating:      5,
      text:        t("items.2.text"),
      achievement: t("items.2.achievement"),
    },
    {
      id: 4,
      name:        t("items.3.name"),
      role:        t("items.3.role"),
      rating:      5,
      text:        t("items.3.text"),
      achievement: t("items.3.achievement"),
    },
  ];

  const next = useCallback(() => {
    setDirection(1);
    setActiveIndex(p => (p + 1) % testimonials.length);
  }, [testimonials.length]);

  const prev = useCallback(() => {
    setDirection(-1);
    setActiveIndex(p => (p - 1 + testimonials.length) % testimonials.length);
  }, [testimonials.length]);

  const goTo = (i) => {
    setDirection(i > activeIndex ? 1 : -1);
    setActiveIndex(i);
  };

  // Auto-play — pauses on hover
  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 5500);
    return () => clearInterval(id);
  }, [next, paused]);

  const slideVariants = {
    enter:  (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0, scale: 0.97 }),
    center:          ({ x: 0, opacity: 1, scale: 1 }),
    exit:   (dir) => ({ x: dir < 0 ? 80 : -80, opacity: 0, scale: 0.97 }),
  };

  const item = testimonials[activeIndex];

  return (
    <section
      className="relative overflow-hidden py-20 sm:py-24 md:py-28"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >

      {/* ── Background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 ltr:right-20 rtl:left-20 w-[500px] h-[500px]
            rounded-full blur-[100px] opacity-[0.12]
            bg-[radial-gradient(circle,var(--color-primary-500),transparent)]"
          animate={{ scale:[1,1.2,1], x:[0,40,0], y:[0,24,0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 ltr:left-20 rtl:right-20 w-[500px] h-[500px]
            rounded-full blur-[100px] opacity-[0.12]
            bg-[radial-gradient(circle,var(--color-secondary-500),transparent)]"
          animate={{ scale:[1.2,1,1.2], x:[0,-28,0], y:[0,-40,0] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
        {/* Fine grid */}
        <div className="absolute inset-0 opacity-[0.025]
          bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)]
          bg-[size:60px_60px]
          [mask-image:radial-gradient(ellipse_at_50%_50%,black_30%,transparent_80%)]" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-16">

        {/* ── Section header ── */}
        <motion.div
          className="text-center mb-14 md:mb-20"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 mb-6 rounded-full
            border border-[var(--color-primary-500)]/25
            bg-[var(--color-primary-500)]/[0.08] backdrop-blur-sm">
            <Heart className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="font-body text-xs font-bold uppercase tracking-[0.14em] text-white/80">
              {t("badge")}
            </span>
          </div>

          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl leading-tight mb-5 px-4">
            <span className="theme-gradient-text">{t("title")}</span>
          </h2>

          <p className="font-body text-base md:text-lg text-white/50
            max-w-2xl mx-auto px-4 leading-relaxed">
            {t("description")}
          </p>
        </motion.div>

        {/* ── Carousel ── */}
        <div className="max-w-5xl mx-auto">

          {/* Card area */}
          <div className="relative mb-8">

            {/* Nav — left */}
            <motion.button
              onClick={prev}
              className="absolute top-1/2 -translate-y-1/2 z-20
                ltr:-left-5 rtl:-right-5 sm:ltr:-left-7 sm:rtl:-right-7
                w-12 h-12 sm:w-14 sm:h-14 rounded-full
                theme-gradient-bg shadow-xl
                flex items-center justify-center
                hover:shadow-[0_0_0_5px_rgba(255,255,255,0.06)]
                transition-shadow duration-200"
              whileHover={{ scale: 1.1, x: -3 }}
              whileTap={{ scale: 0.92 }}
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white rtl:scale-x-[-1]" />
            </motion.button>

            {/* Nav — right */}
            <motion.button
              onClick={next}
              className="absolute top-1/2 -translate-y-1/2 z-20
                ltr:-right-5 rtl:-left-5 sm:ltr:-right-7 sm:rtl:-left-7
                w-12 h-12 sm:w-14 sm:h-14 rounded-full
                theme-gradient-bg shadow-xl
                flex items-center justify-center
                hover:shadow-[0_0_0_5px_rgba(255,255,255,0.06)]
                transition-shadow duration-200"
              whileHover={{ scale: 1.1, x: 3 }}
              whileTap={{ scale: 0.92 }}
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white rtl:scale-x-[-1]" />
            </motion.button>

            {/* Slide */}
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={activeIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x:       { type: "spring", stiffness: 320, damping: 32 },
                  opacity: { duration: 0.22 },
                  scale:   { duration: 0.25 },
                }}
              >
                {/* Card */}
                <div className="relative overflow-hidden rounded-2xl
                  border border-white/[0.08]
                  bg-slate-800/50 backdrop-blur-xl
                  shadow-[0_24px_56px_rgba(0,0,0,0.45)]
                  p-8 sm:p-10 md:p-12">

                  {/* Animated glow shell */}
                  <motion.div
                    className="absolute -inset-[2px] rounded-2xl theme-gradient-bg -z-10 blur-2xl"
                    animate={{ opacity:[0.14,0.24,0.14] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />

                  {/* Shimmer overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03)_0%,transparent_50%)] pointer-events-none rounded-2xl" />

                  {/* Quote chip — top corner */}
                  <motion.div
                    className="absolute -top-5 ltr:-left-5 rtl:-right-5
                      w-14 h-14 rounded-xl theme-gradient-bg
                      flex items-center justify-center shadow-xl"
                    initial={{ scale: 0, rotate: -160 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.15 }}
                  >
                    <Quote className="w-7 h-7 text-white" />
                  </motion.div>

                  <div className="relative z-10 grid md:grid-cols-[auto_1fr] gap-8 md:gap-12 items-center">

                    {/* ── Left: author card ── */}
                    <div className="flex flex-col items-center text-center md:w-52">

                      {/* Avatar */}
                      <motion.div
                        className="relative mb-5"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                      >
                        {/* Spinning gradient ring */}
                        <motion.div
                          className="absolute -inset-[3px] rounded-full theme-gradient-bg blur-sm"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        />
                        {/* Avatar circle */}
                        <div className={`relative w-28 h-28 rounded-full overflow-hidden
                          border-4 border-slate-800
                          bg-gradient-to-br ${AVATAR_GRADIENTS[activeIndex % AVATAR_GRADIENTS.length]}
                          flex items-center justify-center`}>
                          <span className="font-display text-4xl text-white leading-none">
                            {item.name?.charAt(0)}
                          </span>
                        </div>

                        {/* Trophy badge */}
                        <motion.div
                          className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full
                            theme-gradient-bg flex items-center justify-center shadow-lg"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.45, type: "spring" }}
                        >
                          <Trophy className="w-4 h-4 text-white" />
                        </motion.div>
                      </motion.div>

                      {/* Name */}
                      <h3 className="font-body text-xl font-black text-white mb-1 leading-tight">
                        {item.name}
                      </h3>

                      {/* Role */}
                      <p className="font-body text-sm text-white/45 font-medium mb-4">
                        {item.role}
                      </p>

                      {/* Stars */}
                      <div className="flex items-center gap-1 mb-4">
                        {[...Array(item.rating)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, rotate: -160 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.5 + i * 0.08, type: "spring" }}
                          >
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          </motion.div>
                        ))}
                      </div>

                      {/* Achievement pill */}
                      <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5
                        rounded-full border border-white/[0.10]
                        bg-white/[0.06] backdrop-blur-sm">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-body text-[11px] font-bold text-white/80 leading-snug">
                          {item.achievement}
                        </span>
                      </div>
                    </div>

                    {/* ── Right: quote text ── */}
                    <div>
                      {/* Decorative opening marks */}
                      <div className="font-display text-[80px] leading-none
                        text-[var(--color-primary-500)]/20 select-none -mb-6 ltr:ml-0 rtl:text-right">
                        "
                      </div>

                      <motion.p
                        className="font-body text-lg sm:text-xl md:text-2xl
                          italic text-white/80 leading-relaxed"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        {item.text}
                      </motion.p>

                      {/* Closing marks */}
                      <div className="font-display text-[80px] leading-none mt-2
                        text-[var(--color-primary-500)]/20 select-none ltr:text-right rtl:text-left">
                        "
                      </div>

                      {/* Bottom accent line */}
                      <motion.div
                        className="h-[2px] rounded-full theme-gradient-bg mt-4 origin-left"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.5, duration: 0.7 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Dots + counter ── */}
          <div className="flex items-center justify-center gap-5">
            {/* Dot track */}
            <div className="flex items-center gap-2">
              {testimonials.map((_, i) => (
                <motion.button
                  key={i}
                  onClick={() => goTo(i)}
                  className={[
                    "h-2 rounded-full transition-all duration-300",
                    i === activeIndex
                      ? "w-10 bg-[var(--color-primary-500)]"
                      : "w-2 bg-white/20 hover:bg-white/40",
                  ].join(" ")}
                  whileTap={{ scale: 0.9 }}
                />
              ))}
            </div>

            {/* Counter */}
            <span className="font-body text-xs font-bold text-white/30 tabular-nums">
              {String(activeIndex + 1).padStart(2,"0")} / {String(testimonials.length).padStart(2,"0")}
            </span>

            {/* Auto-play progress bar */}
            {!paused && (
              <div className="w-16 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                <motion.div
                  className="h-full theme-gradient-bg rounded-full"
                  key={`${activeIndex}-progress`}
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 5.5, ease: "linear" }}
                />
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}