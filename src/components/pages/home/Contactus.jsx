"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, ChevronDown, Dumbbell,
  Heart, TrendingUp, Award, User, Users,
} from "lucide-react";

// ─── Input field — shared underline style ─────────────────────────────────────
const inputCls = (filled) => [
  "w-full bg-transparent px-0 py-3",
  "border-b-2 transition-colors duration-200 outline-none",
  "font-body text-sm text-white placeholder:text-white/30",
  filled
    ? "border-[var(--color-primary-500)]"
    : "border-white/[0.15] focus:border-[var(--color-primary-500)]/70",
].join(" ");

const labelCls = "font-body text-xs font-bold uppercase tracking-[0.12em] text-white/45 mb-2 block";

export default function ContactUs() {
  const t = useTranslations("home.contact");

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", jobTitle: "",
    email: "", phone: "", countryCode: "+20", teamSize: "",
  });
  const [isSubmitting,        setIsSubmitting]        = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [currentTestimonial,  setCurrentTestimonial]  = useState(0);
  const [submitted,           setSubmitted]           = useState(false);

  const countryCodes = useMemo(() => [
    { code: "+20",  flag: "🇪🇬", country: "Egypt"        },
    { code: "+1",   flag: "🇺🇸", country: "USA"          },
    { code: "+44",  flag: "🇬🇧", country: "UK"           },
    { code: "+971", flag: "🇦🇪", country: "UAE"          },
    { code: "+966", flag: "🇸🇦", country: "Saudi Arabia" },
  ], []);

  const teamSizeOptions = useMemo(() => [
    { id: "solo", label: t("form.teamSize.solo"), description: t("form.teamSize.soloDesc"), icon: User  },
    { id: "team", label: t("form.teamSize.team"), description: t("form.teamSize.teamDesc"), icon: Users },
  ], [t]);

  const testimonials = useMemo(() => [
    { text: t("testimonials.0.text"), author: t("testimonials.0.author"), role: t("testimonials.0.role"), company: t("testimonials.0.company"), icon: TrendingUp },
    { text: t("testimonials.1.text"), author: t("testimonials.1.author"), role: t("testimonials.1.role"), company: t("testimonials.1.company"), icon: Heart      },
    { text: t("testimonials.2.text"), author: t("testimonials.2.author"), role: t("testimonials.2.role"), company: t("testimonials.2.company"), icon: Award      },
  ], [t]);

  // Auto-rotate
  useEffect(() => {
    const id = setInterval(() => setCurrentTestimonial(p => (p + 1) % testimonials.length), 5000);
    return () => clearInterval(id);
  }, [testimonials.length]);

  // Close country dropdown on outside click
  useEffect(() => {
    if (!showCountryDropdown) return;
    const fn = () => setShowCountryDropdown(false);
    document.addEventListener("click", fn);
    return () => document.removeEventListener("click", fn);
  }, [showCountryDropdown]);

  const selectedCountry = countryCodes.find(c => c.code === formData.countryCode);
  const handleChange    = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 2000));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  const item = testimonials[currentTestimonial];

  return (
    <section className="relative overflow-hidden py-20 sm:py-24 md:py-28">

      {/* ── Background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute ltr:right-20 rtl:left-20 top-20
            w-[600px] h-[600px] rounded-full blur-[120px] opacity-[0.18]
            bg-[radial-gradient(circle,var(--color-primary-500),transparent)]"
          animate={{ scale:[1,1.2,1], opacity:[0.15,0.28,0.15] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute ltr:left-20 rtl:right-20 bottom-20
            w-[600px] h-[600px] rounded-full blur-[120px] opacity-[0.18]
            bg-[radial-gradient(circle,var(--color-secondary-500),transparent)]"
          animate={{ scale:[1.2,1,1.2], opacity:[0.28,0.15,0.28] }}
          transition={{ duration: 8, repeat: Infinity, delay: 1 }}
        />
        <div className="absolute inset-0 opacity-[0.02]
          bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)]
          bg-[size:60px_60px]
          [mask-image:radial-gradient(ellipse_at_50%_50%,black_30%,transparent_80%)]" />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-16">
        <div className="grid items-start gap-12 lg:gap-16 lg:grid-cols-2">

          {/* ═══════════════════════════════
              LEFT — Form
          ═══════════════════════════════ */}
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
          >
            {/* Header */}
            <div className="space-y-3">
              <h2 className="font-display text-4xl sm:text-5xl md:text-6xl text-white leading-tight">
                <span className="theme-gradient-text">{t("title")}</span>
              </h2>
              <p className="font-body text-base md:text-lg text-white/50 max-w-md leading-relaxed">
                {t("description")}
              </p>
            </div>

            {/* ── Form ── */}
            <AnimatePresence mode="wait">
              {submitted ? (
                /* Success state */
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-5 py-16 text-center
                    border border-[var(--color-primary-500)]/25 rounded-2xl
                    bg-[var(--color-primary-500)]/[0.06] backdrop-blur-sm"
                >
                  <motion.div
                    className="w-16 h-16 rounded-full theme-gradient-bg flex items-center justify-center shadow-xl"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 220 }}
                  >
                    <Check className="w-8 h-8 text-white" strokeWidth={3} />
                  </motion.div>
                  <div>
                    <h3 className="font-body text-2xl font-black text-white mb-1">{t("form.successTitle") || "Message sent!"}</h3>
                    <p className="font-body text-white/50 text-sm">{t("form.successDesc") || "We'll get back to you within 24 hours."}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  className="space-y-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {/* Name row */}
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>{t("form.fields.firstName")}</label>
                      <input type="text" name="firstName" value={formData.firstName}
                        onChange={handleChange} required
                        className={inputCls(!!formData.firstName)} />
                    </div>
                    <div>
                      <label className={labelCls}>{t("form.fields.lastName")}</label>
                      <input type="text" name="lastName" value={formData.lastName}
                        onChange={handleChange} required
                        className={inputCls(!!formData.lastName)} />
                    </div>
                  </div>

                  {/* Job title */}
                  <div>
                    <label className={labelCls}>{t("form.fields.jobTitle")}</label>
                    <input type="text" name="jobTitle" value={formData.jobTitle}
                      onChange={handleChange} required
                      className={inputCls(!!formData.jobTitle)} />
                  </div>

                  {/* Email */}
                  <div>
                    <label className={labelCls}>{t("form.fields.email")}</label>
                    <input type="email" name="email" value={formData.email}
                      onChange={handleChange} required
                      className={inputCls(!!formData.email)} />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className={labelCls}>{t("form.fields.phone")}</label>
                    <div className="flex gap-3 items-end">
                      {/* Country code picker */}
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setShowCountryDropdown(v => !v); }}
                          className="flex items-center gap-1.5 pb-3 border-b-2 border-white/[0.15]
                            hover:border-[var(--color-primary-500)]/60 transition-colors duration-200
                            font-body text-sm text-white outline-none"
                        >
                          <span className="text-lg">{selectedCountry?.flag}</span>
                          <span>{formData.countryCode}</span>
                          <motion.div animate={{ rotate: showCountryDropdown ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown className="w-4 h-4 text-white/40" />
                          </motion.div>
                        </button>

                        <AnimatePresence>
                          {showCountryDropdown && (
                            <motion.div
                              initial={{ opacity: 0, y: -8, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -8, scale: 0.97 }}
                              transition={{ duration: 0.15 }}
                              className="absolute ltr:left-0 rtl:right-0 top-full mt-2 z-50
                                w-56 rounded-xl overflow-hidden
                                border border-white/[0.08] bg-slate-800 shadow-2xl"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {countryCodes.map(c => (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => { setFormData(p => ({ ...p, countryCode: c.code })); setShowCountryDropdown(false); }}
                                  className="flex w-full items-center gap-3 px-4 py-3
                                    font-body text-sm text-left
                                    hover:bg-white/[0.06] transition-colors duration-150"
                                >
                                  <span className="text-lg">{c.flag}</span>
                                  <span className="font-bold text-white">{c.code}</span>
                                  <span className="text-white/45">{c.country}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <input type="tel" name="phone" value={formData.phone}
                        onChange={handleChange} placeholder="000 000 0000" required
                        className={`flex-1 ${inputCls(!!formData.phone)}`} />
                    </div>
                  </div>

                  {/* Team size */}
                  <div>
                    <label className={labelCls}>{t("form.fields.teamSize")}</label>
                    <div className="space-y-3 mt-1">
                      {teamSizeOptions.map(option => {
                        const Icon       = option.icon;
                        const isSelected = formData.teamSize === option.id;
                        return (
                          <motion.button
                            key={option.id}
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, teamSize: option.id }))}
                            className={[
                              "flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left",
                              "transition-all duration-200",
                              isSelected
                                ? "border-[var(--color-primary-500)]/70 bg-[var(--color-primary-500)]/[0.07]"
                                : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18]",
                            ].join(" ")}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            <div className={[
                              "w-11 h-11 shrink-0 rounded-xl flex items-center justify-center",
                              isSelected ? "theme-gradient-bg" : "bg-white/[0.06]",
                            ].join(" ")}>
                              <Icon className={`w-5 h-5 ${isSelected ? "text-white" : "text-white/40"}`} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className={`font-body font-bold text-sm ${isSelected ? "text-white" : "text-white/70"}`}>
                                  {option.label}
                                </h4>
                                {isSelected && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-5 h-5 rounded-full theme-gradient-bg
                                      flex items-center justify-center shrink-0"
                                  >
                                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                  </motion.div>
                                )}
                              </div>
                              <p className="font-body text-xs text-white/35 mt-0.5 leading-relaxed">
                                {option.description}
                              </p>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative w-full overflow-hidden rounded-xl px-8 py-4
                      font-body text-base font-bold text-white
                      theme-gradient-bg shadow-[0_8px_32px_var(--color-primary-500)/30]
                      hover:shadow-[0_12px_40px_var(--color-primary-500)/45]
                      disabled:cursor-not-allowed disabled:opacity-50
                      transition-shadow duration-200"
                    whileHover={{ scale: isSubmitting ? 1 : 1.01, y: isSubmitting ? 0 : -2 }}
                    whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                  >
                    {/* Shimmer */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full"
                      whileHover={{ x: "200%" }}
                      transition={{ duration: 0.75 }}
                    />
                    <span className="relative flex items-center justify-center gap-2">
                      {isSubmitting ? (
                        <>
                          <motion.div
                            className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                          {t("form.submitting")}
                        </>
                      ) : (
                        t("form.submit")
                      )}
                    </span>
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ═══════════════════════════════
              RIGHT — Testimonial card
          ═══════════════════════════════ */}
          <motion.div
            className="relative lg:sticky lg:top-8 lg:self-start"
            initial={{ opacity: 0, x: 28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.15 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, scale: 0.97, y: 10 }}
                animate={{ opacity: 1, scale: 1,    y: 0  }}
                exit={{   opacity: 0, scale: 0.97, y: -10 }}
                transition={{ duration: 0.4 }}
                className="relative overflow-hidden rounded-2xl
                  border border-white/[0.08]
                  bg-gradient-to-br from-slate-800/90 to-slate-900/90
                  backdrop-blur-xl
                  shadow-[0_24px_56px_rgba(0,0,0,0.45)]"
              >
                {/* Animated tint */}
                <motion.div
                  className="absolute inset-0 theme-gradient-bg pointer-events-none"
                  animate={{ opacity:[0.06,0.12,0.06] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />

                {/* ── Brand header ── */}
                <div className="relative border-b border-white/[0.07] p-7">
                  <div className="flex items-center gap-4">
                    <motion.div
                      className="w-14 h-14 rounded-xl theme-gradient-bg
                        flex items-center justify-center shadow-xl shrink-0"
                      whileHover={{ rotate:[0,-10,10,-8,0], scale:1.06 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Dumbbell className="w-7 h-7 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="font-display text-2xl text-white leading-none">FitnessHub</h3>
                      <p className="font-body text-sm text-white/45 mt-1">{t("testimonials.subtitle")}</p>
                    </div>
                  </div>
                </div>

                {/* ── Visual area ── */}
                <div className="relative h-72 sm:h-80 overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800">
                  {/* Diagonal stripe texture */}
                  <motion.div
                    className="absolute inset-0 opacity-20"
                    animate={{ x:[0,22,0] }}
                    transition={{ duration: 5, repeat: Infinity, ease:"easeInOut" }}
                  >
                    <div className="h-full w-full
                      bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.05)_10px,rgba(255,255,255,0.05)_20px)]" />
                  </motion.div>

                  {/* Icon bubble */}
                  <div className="absolute inset-0 grid place-items-center">
                    <motion.div
                      key={currentTestimonial}
                      initial={{ scale: 0, rotate: -160 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type:"spring", stiffness:200, damping:15 }}
                      className="w-40 h-40 rounded-full theme-gradient-bg
                        flex items-center justify-center shadow-2xl"
                    >
                      <item.icon className="w-20 h-20 text-white" strokeWidth={1.5} />
                    </motion.div>
                  </div>

                  {/* Bottom fade */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                  <div className="absolute inset-0 opacity-15 theme-gradient-bg" />
                </div>

                {/* ── Quote content ── */}
                <div className="relative p-7 space-y-5">
                  {/* Opening quote mark */}
                  <div className="font-display text-5xl leading-none
                    text-[var(--color-primary-500)]/25 select-none -mb-3">
                    "
                  </div>

                  <motion.p
                    className="font-body text-base md:text-lg leading-relaxed text-white/80 italic"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 }}
                  >
                    {item.text}
                  </motion.p>

                  <div className="flex items-center justify-between pt-4
                    border-t border-white/[0.07]">
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.28 }}
                    >
                      <p className="font-body text-base font-black text-white leading-tight">{item.author}</p>
                      <p className="font-body text-xs text-white/40 mt-0.5">{item.role}</p>
                    </motion.div>

                    <motion.div
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.36 }}
                    >
                      <div className="w-2 h-2 rounded-full theme-gradient-bg" />
                      <span className="font-body text-sm font-bold text-white/70">{item.company}</span>
                    </motion.div>
                  </div>
                </div>

                {/* ── Dots ── */}
                <div className="flex justify-center gap-2 pb-5">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentTestimonial(i)}
                      className="group"
                    >
                      <motion.div
                        className={[
                          "h-1.5 rounded-full transition-all duration-300",
                          i === currentTestimonial
                            ? "w-8 bg-[var(--color-primary-400)]"
                            : "w-1.5 bg-white/20 group-hover:bg-white/40",
                        ].join(" ")}
                        whileTap={{ scale: 0.9 }}
                      />
                    </button>
                  ))}
                </div>

              </motion.div>
            </AnimatePresence>
          </motion.div>

        </div>
      </div>
    </section>
  );
}