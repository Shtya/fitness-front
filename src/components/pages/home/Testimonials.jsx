"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
  Star,
  Quote,
  ChevronLeft,
  ChevronRight,
  Heart,
  TrendingUp,
  Trophy,
} from "lucide-react";
import SectionHeader from "./SectionHeader";

const AVATAR_GRADIENTS = [
  "from-[var(--color-primary-500)] to-[var(--color-secondary-600)]",
  "from-[var(--color-secondary-500)] to-[var(--color-primary-600)]",
  "from-[var(--color-primary-400)] to-[var(--color-primary-700)]",
  "from-[var(--color-secondary-400)] to-[var(--color-secondary-700)]",
];

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [paused, setPaused] = useState(false);
  const t = useTranslations("home.testimonials");

  const testimonials = [
    {
      id: 1,
      name: t("items.0.name"),
      role: t("items.0.role"),
      rating: 5,
      text: t("items.0.text"),
      achievement: t("items.0.achievement"),
    },
    {
      id: 2,
      name: t("items.1.name"),
      role: t("items.1.role"),
      rating: 5,
      text: t("items.1.text"),
      achievement: t("items.1.achievement"),
    },
    {
      id: 3,
      name: t("items.2.name"),
      role: t("items.2.role"),
      rating: 5,
      text: t("items.2.text"),
      achievement: t("items.2.achievement"),
    },
    {
      id: 4,
      name: t("items.3.name"),
      role: t("items.3.role"),
      rating: 5,
      text: t("items.3.text"),
      achievement: t("items.3.achievement"),
    },
  ];

  const next = useCallback(() => {
    setDirection(1);
    setActiveIndex((p) => (p + 1) % testimonials.length);
  }, [testimonials.length]);

  const prev = useCallback(() => {
    setDirection(-1);
    setActiveIndex((p) => (p - 1 + testimonials.length) % testimonials.length);
  }, [testimonials.length]);

  const goTo = (i) => {
    setDirection(i > activeIndex ? 1 : -1);
    setActiveIndex(i);
  };

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 5500);
    return () => clearInterval(id);
  }, [next, paused]);

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0, scale: 0.97 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir) => ({ x: dir < 0 ? 80 : -80, opacity: 0, scale: 0.97 }),
  };

  const item = testimonials[activeIndex];

  return (
    <section
      className="relative overflow-hidden py-20 sm:py-24 md:py-28"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 h-[500px] w-[500px] rounded-full blur-[100px] opacity-[0.12] ltr:right-20 rtl:left-20
          bg-[radial-gradient(circle,var(--color-primary-500),transparent)]"
          animate={{ scale: [1, 1.2, 1], x: [0, 40, 0], y: [0, 24, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 h-[500px] w-[500px] rounded-full blur-[100px] opacity-[0.12] ltr:left-20 rtl:right-20
          bg-[radial-gradient(circle,var(--color-secondary-500),transparent)]"
          animate={{ scale: [1.2, 1, 1.2], x: [0, -28, 0], y: [0, -40, 0] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]
          bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)]
          bg-[size:60px_60px]
          [mask-image:radial-gradient(ellipse_at_50%_50%,black_30%,transparent_80%)]"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] px-6 lg:px-16">
				<SectionHeader id="testimonials" badge={t("badge")} title={t("title")} subtitle={t("description")} />
         

        <div className="mx-auto max-w-5xl">
          <div className="relative mb-8">
            <motion.button
              onClick={prev}
              className="absolute top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full theme-gradient-bg shadow-xl transition-shadow duration-200
              hover:shadow-[0_0_0_5px_rgba(255,255,255,0.06)]
              ltr:-left-5 rtl:-right-5 sm:h-14 sm:w-14 ltr:sm:-left-7 rtl:sm:-right-7"
              whileHover={{ scale: 1.1, x: -3 }}
              whileTap={{ scale: 0.92 }}
            >
              <ChevronLeft className="h-5 w-5 text-white rtl:scale-x-[-1] sm:h-6 sm:w-6" />
            </motion.button>

            <motion.button
              onClick={next}
              className="absolute top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full theme-gradient-bg shadow-xl transition-shadow duration-200
              hover:shadow-[0_0_0_5px_rgba(255,255,255,0.06)]
              ltr:-right-5 rtl:-left-5 sm:h-14 sm:w-14 ltr:sm:-right-7 rtl:sm:-left-7"
              whileHover={{ scale: 1.1, x: 3 }}
              whileTap={{ scale: 0.92 }}
            >
              <ChevronRight className="h-5 w-5 text-white rtl:scale-x-[-1] sm:h-6 sm:w-6" />
            </motion.button>

            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={activeIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 320, damping: 32 },
                  opacity: { duration: 0.22 },
                  scale: { duration: 0.25 },
                }}
              >
                <div
                  className="relative  rounded-lg border border-white/[0.08] bg-slate-800/50 p-8 shadow-[0_24px_56px_rgba(0,0,0,0.45)]
                  backdrop-blur-xl sm:p-10 md:p-12"
                >
                  <motion.div
                    className="theme-gradient-bg absolute -inset-[2px] -z-10 rounded-lg blur-2xl"
                    animate={{ opacity: [0.14, 0.24, 0.14] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />

                  <div className="pointer-events-none absolute inset-0 rounded-lg bg-[linear-gradient(135deg,rgba(255,255,255,0.03)_0%,transparent_50%)]" />

                  <motion.div
                    className="theme-gradient-bg absolute -top-5 flex h-14 w-14 items-center justify-center rounded-lg shadow-xl ltr:-left-5 rtl:-right-5"
                    initial={{ scale: 0, rotate: -160 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.15 }}
                  >
                    <Quote className="h-7 w-7 text-white" />
                  </motion.div>

                  <div className="relative z-10 grid items-center gap-8 md:grid-cols-[auto_1fr] md:gap-12">
                    <div className="flex flex-col items-center text-center md:w-52">
                      <motion.div
                        className="relative mb-5"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                      >
                        <motion.div
                          className="theme-gradient-bg absolute -inset-[3px] rounded-full blur-sm"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />

                        <div
                          className={`relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-slate-800 bg-gradient-to-br ${
                            AVATAR_GRADIENTS[
                              activeIndex % AVATAR_GRADIENTS.length
                            ]
                          }`}
                        >
                          <span className="font-display text-4xl md: leading-none text-white">
                            {item.name?.charAt(0)}
                          </span>
                        </div>

                        <motion.div
                          className="theme-gradient-bg absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full shadow-lg"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.45, type: "spring" }}
                        >
                          <Trophy className="h-4 w-4 text-white" />
                        </motion.div>
                      </motion.div>

                      <h3 className="font-body mb-1 text-xl font-black md: leading-tight text-white">
                        {item.name}
                      </h3>

                      <p className="font-body mb-4 text-sm font-medium text-white/45">
                        {item.role}
                      </p>

                      <div className="mb-4 flex items-center gap-1">
                        {[...Array(item.rating)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, rotate: -160 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                              delay: 0.5 + i * 0.08,
                              type: "spring",
                            }}
                          >
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          </motion.div>
                        ))}
                      </div>

                      <div
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.10]
                        bg-white/[0.06] px-3.5 py-1.5 backdrop-blur-sm"
                      >
                        <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <span className="font-body text-[11px] font-bold md: leading-snug text-white/80">
                          {item.achievement}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="font-display -mb-6 select-none text-[80px] md: leading-none text-[var(--color-primary-500)]/20 ltr:ml-0 rtl:text-right">
                        "
                      </div>

                      <motion.p
                        className="font-body text-lg italic md: leading-relaxed text-white/80 sm:text-xl md:text-2xl"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        {item.text}
                      </motion.p>

                      <div className="font-display mt-2 select-none text-[80px] md: leading-none text-[var(--color-primary-500)]/20 ltr:text-right rtl:text-left">
                        "
                      </div>

                      <motion.div
                        className="theme-gradient-bg mt-4 h-[2px] origin-left rounded-full"
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

          <div className="flex items-center justify-center gap-5">
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

            <span className="font-body tabular-nums text-xs font-bold text-white/30">
              {String(activeIndex + 1).padStart(2, "0")} /{" "}
              {String(testimonials.length).padStart(2, "0")}
            </span>

            {!paused && (
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.08]">
                <motion.div
                  className="theme-gradient-bg h-full rounded-full"
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