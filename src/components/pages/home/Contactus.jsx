"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  Dumbbell,
  Heart,
  TrendingUp,
  Award,
  User,
  Users,
} from "lucide-react";

export default function ContactUsNew() {
  const t = useTranslations("home.contact");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    jobTitle: "",
    email: "",
    phone: "",
    countryCode: "+20",
    teamSize: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const countryCodes = useMemo(
    () => [
      { code: "+20", flag: "🇪🇬", country: "Egypt" },
      { code: "+1", flag: "🇺🇸", country: "USA" },
      { code: "+44", flag: "🇬🇧", country: "UK" },
      { code: "+971", flag: "🇦🇪", country: "UAE" },
      { code: "+966", flag: "🇸🇦", country: "Saudi Arabia" },
    ],
    []
  );

  const teamSizeOptions = useMemo(
    () => [
      {
        id: "solo",
        label: t("form.teamSize.solo"),
        description: t("form.teamSize.soloDesc"),
        icon: User,
      },
      {
        id: "team",
        label: t("form.teamSize.team"),
        description: t("form.teamSize.teamDesc"),
        icon: Users,
      },
    ],
    [t]
  );

  const testimonials = useMemo(
    () => [
      {
        text: t("testimonials.0.text"),
        author: t("testimonials.0.author"),
        role: t("testimonials.0.role"),
        company: t("testimonials.0.company"),
        icon: TrendingUp,
      },
      {
        text: t("testimonials.1.text"),
        author: t("testimonials.1.author"),
        role: t("testimonials.1.role"),
        company: t("testimonials.1.company"),
        icon: Heart,
      },
      {
        text: t("testimonials.2.text"),
        author: t("testimonials.2.author"),
        role: t("testimonials.2.role"),
        company: t("testimonials.2.company"),
        icon: Award,
      },
    ],
    [t]
  );

  // ✅ Auto-rotate testimonials (fixed: NOT in render)
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(id);
  }, [testimonials.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showCountryDropdown) return;
    const onDocClick = () => setShowCountryDropdown(false);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [showCountryDropdown]);

  const selectedCountry = countryCodes.find((c) => c.code === formData.countryCode);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsSubmitting(false);
  };

  const handleChange = (e) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  return (
    <section className="relative min-h-screen overflow-hidden py-24">
      {/* Background effects (theme-based) */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute right-20 top-20 h-[600px] w-[600px] rounded-full blur-3xl"
          style={{
            background:
              "color-mix(in srgb, var(--color-primary-500) 22%, transparent)",
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 left-20 h-[600px] w-[600px] rounded-full blur-3xl"
          style={{
            background:
              "color-mix(in srgb, var(--color-secondary-500) 22%, transparent)",
          }}
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.45, 0.25, 0.45] }}
          transition={{ duration: 8, repeat: Infinity, delay: 1 }}
        />
      </div>

      <div className="relative z-10 container  px-6">
        <div className="mx-auto grid  items-center gap-12 lg:grid-cols-2">
          {/* Left - Form */}
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Header */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-5xl font-black text-white md:text-6xl">
                {t("title")}
              </h2>
              <p className="max-w-md text-lg leading-relaxed text-gray-400">
                {t("description")}
              </p>
            </motion.div>

            {/* Form */}
            <motion.form
              onSubmit={handleSubmit}
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-400">
                    {t("form.fields.firstName")}
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full border-b-2 border-gray-700 bg-transparent px-4 py-3 text-white outline-none transition-colors placeholder:text-gray-500 focus:border-[color:var(--color-primary-500)]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-400">
                    {t("form.fields.lastName")}
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full border-b-2 border-gray-700 bg-transparent px-4 py-3 text-white outline-none transition-colors placeholder:text-gray-500 focus:border-[color:var(--color-primary-500)]"
                  />
                </div>
              </div>

              {/* Job title */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-400">
                  {t("form.fields.jobTitle")}
                </label>
                <input
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleChange}
                  required
                  className="w-full border-b-2 border-gray-700 bg-transparent px-4 py-3 text-white outline-none transition-colors placeholder:text-gray-500 focus:border-[color:var(--color-primary-500)]"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-400">
                  {t("form.fields.email")}
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full border-b-2 border-gray-700 bg-transparent px-4 py-3 text-white outline-none transition-colors placeholder:text-gray-500 focus:border-[color:var(--color-primary-500)]"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-400">
                  {t("form.fields.phone")}
                </label>

                <div className="flex gap-2">
                  {/* Country dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCountryDropdown((v) => !v);
                      }}
                      className="flex min-w-[110px] items-center gap-2 border-b-2 border-gray-700 bg-transparent px-4 py-3 text-white outline-none transition-colors hover:border-gray-600"
                    >
                      <span className="text-xl">{selectedCountry?.flag}</span>
                      <span className="text-sm">{formData.countryCode}</span>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </button>

                    <AnimatePresence>
                      {showCountryDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-2xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {countryCodes.map((country) => (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => {
                                setFormData((p) => ({
                                  ...p,
                                  countryCode: country.code,
                                }));
                                setShowCountryDropdown(false);
                              }}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-700"
                            >
                              <span className="text-xl">{country.flag}</span>
                              <span className="font-medium text-white">{country.code}</span>
                              <span className="text-sm text-gray-400">{country.country}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    required
                    className="flex-1 border-b-2 border-gray-700 bg-transparent px-4 py-3 text-white outline-none transition-colors placeholder:text-gray-500 focus:border-[color:var(--color-primary-500)]"
                  />
                </div>
              </div>

              {/* Team size */}
              <div>
                <label className="mb-4 block text-sm font-semibold text-gray-400">
                  {t("form.fields.teamSize")}
                </label>

                <div className="space-y-3">
                  {teamSizeOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = formData.teamSize === option.id;

                    return (
                      <motion.button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          setFormData((p) => ({ ...p, teamSize: option.id }))
                        }
                        className={[
                          "flex w-full items-start gap-4 rounded-lg border-2 p-5 text-left transition-all",
                          isSelected
                            ? "border-[color:var(--color-primary-500)] bg-white/5"
                            : "border-gray-700 bg-transparent hover:border-gray-600",
                        ].join(" ")}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div
                          className={[
                            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg",
                            isSelected ? "theme-gradient-bg" : "bg-gray-800",
                          ].join(" ")}
                        >
                          <Icon
                            className={[
                              "h-6 w-6",
                              isSelected ? "text-white" : "text-gray-400",
                            ].join(" ")}
                          />
                        </div>

                        <div className="flex-1">
                          <div className="mb-1 flex items-center justify-between">
                            <h4
                              className={[
                                "font-bold",
                                isSelected ? "text-white" : "text-gray-300",
                              ].join(" ")}
                            >
                              {option.label}
                            </h4>

                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--color-primary-500)]"
                              >
                                <Check className="h-4 w-4 text-white" strokeWidth={3} />
                              </motion.div>
                            )}
                          </div>

                          <p className="text-sm text-gray-400">{option.description}</p>
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
                className="group relative w-full overflow-hidden rounded-lg px-8 py-5 text-lg font-bold text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-50 theme-gradient-bg"
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              >
                <motion.div
                  className="absolute inset-0 translate-x-[-100%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)]"
                  whileHover={{ x: "200%" }}
                  transition={{ duration: 0.8 }}
                />
                <span className="relative flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <motion.div
                        className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
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
          </motion.div>

          {/* Right - Testimonial card */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.5 }}
                className="relative overflow-hidden rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.45)]"
              >
                {/* animated theme overlay */}
                <motion.div
                  className="absolute inset-0 opacity-10 theme-gradient-bg"
                  animate={{ opacity: [0.08, 0.14, 0.08] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />

                {/* header */}
                <div className="relative border-b border-slate-700/50 p-8">
                  <div className="flex items-center gap-4">
                    <motion.div
                      className="flex h-16 w-16 items-center justify-center rounded-lg shadow-xl theme-gradient-bg"
                      whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.08 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Dumbbell className="h-8 w-8 text-white" />
                    </motion.div>

                    <div>
                      <h3 className="mb-1 text-2xl font-black text-white">FitnessHub</h3>
                      <p className="text-sm text-gray-400">{t("testimonials.subtitle")}</p>
                    </div>
                  </div>
                </div>

                {/* image area */}
                <div className="relative h-[400px] overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800">
                  {/* pattern overlay (no inline style) */}
                  <motion.div
                    className="absolute inset-0 opacity-25"
                    animate={{ x: [0, 22, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  >
                    <div className="h-full w-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.06)_10px,rgba(255,255,255,0.06)_20px)]" />
                  </motion.div>

                  {/* icon bubble */}
                  <div className="absolute inset-0 grid place-items-center">
                    {(() => {
                      const TestimonialIcon = testimonials[currentTestimonial].icon;
                      return (
                        <motion.div
                          key={currentTestimonial}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 200, damping: 15 }}
                          className="flex h-48 w-48 items-center justify-center rounded-full shadow-2xl theme-gradient-bg"
                        >
                          <TestimonialIcon className="h-24 w-24 text-white" strokeWidth={1.5} />
                        </motion.div>
                      );
                    })()}
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                  <div className="absolute inset-0 opacity-20 theme-gradient-bg" />
                </div>

                {/* content */}
                <div className="relative space-y-6 p-8">
                  <motion.p
                    className="text-lg leading-relaxed text-white"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    "{testimonials[currentTestimonial].text}"
                  </motion.p>

                  <div className="flex items-center justify-between border-t border-slate-700/50 pt-6">
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <h4 className="text-lg font-bold text-white">
                        {testimonials[currentTestimonial].author}
                      </h4>
                      <p className="text-sm text-gray-400">
                        {testimonials[currentTestimonial].role}
                      </p>
                    </motion.div>

                    <motion.div
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="h-2 w-2 rounded-full theme-gradient-bg" />
                      <span className="font-semibold text-white">
                        {testimonials[currentTestimonial].company}
                      </span>
                    </motion.div>
                  </div>
                </div>

                {/* dots */}
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentTestimonial(index)}
                      className="group relative"
                      type="button"
                    >
                      <motion.div
                        className={[
                          "h-2 rounded-full transition-all",
                          index === currentTestimonial
                            ? "w-8 bg-white"
                            : "w-2 bg-gray-600 hover:bg-gray-500",
                        ].join(" ")}
                        whileHover={{ scale: 1.2 }}
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
