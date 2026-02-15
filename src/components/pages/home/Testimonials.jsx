"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
  Star,
  Quote,
  ChevronLeft,
  ChevronRight,
  Heart,
  Trophy,
  TrendingUp,
} from "lucide-react";

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const t = useTranslations("home.testimonials");

  const testimonials = [
    {
      id: 1,
      name: t("items.0.name"),
      role: t("items.0.role"),
      image: "/images/testimonials/client1.jpg",
      rating: 5,
      text: t("items.0.text"),
      achievement: t("items.0.achievement"),
    },
    {
      id: 2,
      name: t("items.1.name"),
      role: t("items.1.role"),
      image: "/images/testimonials/client2.jpg",
      rating: 5,
      text: t("items.1.text"),
      achievement: t("items.1.achievement"),
    },
    {
      id: 3,
      name: t("items.2.name"),
      role: t("items.2.role"),
      image: "/images/testimonials/client3.jpg",
      rating: 5,
      text: t("items.2.text"),
      achievement: t("items.2.achievement"),
    },
    {
      id: 4,
      name: t("items.3.name"),
      role: t("items.3.role"),
      image: "/images/testimonials/client4.jpg",
      rating: 5,
      text: t("items.3.text"),
      achievement: t("items.3.achievement"),
    },
  ];

  const nextTestimonial = () => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  // Auto-play
  useEffect(() => {
    const timer = setInterval(() => nextTestimonial(), 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.85,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir) => ({
      zIndex: 0,
      x: dir < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.85,
    }),
  };

  const testimonial = testimonials[activeIndex];

  return (
    <section className="relative overflow-hidden py-24">
      {/* Background Effects (theme-based) */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute right-20 top-20 h-96 w-96 rounded-full blur-3xl"
          style={{
            background:
              "color-mix(in srgb, var(--color-primary-500) 20%, transparent)",
          }}
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 left-20 h-96 w-96 rounded-full blur-3xl"
          style={{
            background:
              "color-mix(in srgb, var(--color-secondary-500) 20%, transparent)",
          }}
          animate={{ scale: [1.2, 1, 1.2], x: [0, -30, 0], y: [0, -50, 0] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-6">
        {/* Header */}
        <motion.div
          className="mb-20 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 backdrop-blur-sm">
            <Heart className="h-4 w-4 animate-pulse text-red-400" />
            <span className="text-sm font-bold uppercase tracking-wide text-white/90">
              {t("badge")}
            </span>
          </div>

          <h2 className="mb-6 text-5xl font-black text-white md:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-r from-white via-white/80 to-white bg-clip-text text-transparent">
              {t("title")}
            </span>
          </h2>

          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-gray-300 md:text-xl">
            {t("description")}
          </p>
        </motion.div>

        {/* Carousel */}
        <div className="mx-auto mb-16 max-w-7xl">
          <div className="relative">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={activeIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.3 },
                  scale: { duration: 0.4 },
                }}
                className="relative"
              >
                <div
                  className={[
                    "relative overflow-hidden rounded-lg border border-slate-700/50",
                    "bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-12 backdrop-blur-xl",
                    "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.45)]",
                  ].join(" ")}
                >
                  {/* Animated glow shell (theme gradient) */}
                  <motion.div
                    className="pointer-events-none absolute -inset-1 rounded-lg opacity-20 blur-2xl theme-gradient-bg"
                    animate={{ opacity: [0.18, 0.28, 0.18] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />

                  <div className="relative z-10">
                    {/* Quote icon */}
                    <motion.div
                      className="absolute -left-6 -top-6 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 shadow-xl"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    >
                      <Quote className="h-8 w-8" style={{ color: "var(--color-primary-300)" }} />
                    </motion.div>

                    <div className="grid items-center gap-8 md:grid-cols-3">
                      {/* Left */}
                      <div className="flex flex-col items-center text-center">
                        {/* Avatar ring */}
                        <motion.div
                          className="relative mb-6"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                        >
                          <motion.div
                            className="absolute -inset-2 rounded-full blur-md theme-gradient-bg"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          />

                          <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-slate-800">
                            {/* if you want real image: replace this div with <img ... /> */}
                            <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,var(--color-primary-500)_20%,transparent),linear-gradient(135deg,var(--color-secondary-500)_20%,transparent)]">
                              <span className="text-4xl font-black text-white">
                                {testimonial.name?.charAt(0)}
                              </span>
                            </div>
                          </div>

                          {/* Badge */}
                          <motion.div
                            className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full shadow-lg theme-gradient-bg"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5, type: "spring" }}
                          >
                            <Trophy className="h-5 w-5 text-white" />
                          </motion.div>
                        </motion.div>

                        <h3 className="mb-2 text-2xl font-black text-white">
                          {testimonial.name}
                        </h3>
                        <p className="mb-4 font-semibold text-gray-400">
                          {testimonial.role}
                        </p>

                        {/* Stars */}
                        <div className="mb-4 flex gap-1">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ delay: 0.6 + i * 0.1 }}
                            >
                              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                            </motion.div>
                          ))}
                        </div>

                        {/* Achievement */}
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 backdrop-blur-sm">
                          <TrendingUp className="h-4 w-4 text-green-400" />
                          <span className="text-sm font-bold text-white">
                            {testimonial.achievement}
                          </span>
                        </div>
                      </div>

                      {/* Right */}
                      <div className="md:col-span-2">
                        <motion.p
                          className="text-xl italic leading-relaxed text-gray-200 md:text-2xl"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                        >
                          "{testimonial.text}"
                        </motion.p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Nav buttons (theme gradient) */}
            <div className="pointer-events-none absolute left-0 right-0 top-1/2 z-[100] flex -translate-y-1/2 justify-between">
              <motion.button
                onClick={prevTestimonial}
                className="pointer-events-auto -ml-7 flex h-14 w-14 items-center justify-center rounded-full shadow-xl theme-gradient-bg hover:shadow-[0_0_0_6px_rgba(255,255,255,0.06)]"
                whileHover={{ scale: 1.1, x: -5 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronLeft className="h-6 w-6 text-white rtl:scale-x-[-1]" />
              </motion.button>

              <motion.button
                onClick={nextTestimonial}
                className="pointer-events-auto -mr-7 flex h-14 w-14 items-center justify-center rounded-full shadow-xl theme-gradient-bg hover:shadow-[0_0_0_6px_rgba(255,255,255,0.06)]"
                whileHover={{ scale: 1.1, x: 5 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronRight className="h-6 w-6 text-white rtl:scale-x-[-1]" />
              </motion.button>
            </div>
          </div>

          {/* Dots (theme-based) */}
          <div className="mt-8 flex justify-center gap-3">
            {testimonials.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => {
                  setDirection(index > activeIndex ? 1 : -1);
                  setActiveIndex(index);
                }}
                className={[
                  "h-2 rounded-full transition-all",
                  index === activeIndex
                    ? "w-12 bg-[color:var(--color-primary-500)]"
                    : "w-2 bg-slate-600",
                ].join(" ")}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
