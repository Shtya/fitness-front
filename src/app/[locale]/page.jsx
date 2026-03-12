"use client";

import { useState, useEffect, useRef } from "react";
import {
  ClipboardCheck,
  Lightbulb,
  PenTool,
  Code,
  Search,
  Settings,
  CheckCircle2,
  Trophy,
  Target,
  TrendingUp,
  Users,
  Check,
  Zap,
  Crown,
  Rocket,
  Star,
} from "lucide-react";
import { useTranslations } from "next-intl";

import FitnessHero from "@/components/pages/home/hero";
import RoleTabsDemo from "@/components/pages/home/RoleTabs";
import Testimonials from "@/components/pages/home/Testimonials";
import ContactUs from "@/components/pages/home/Contactus";
import FAQs from "@/components/pages/home/Faqs";
import HowItWork from "@/components/pages/home/HowItWorks";
import Navbar from "@/components/pages/home/Navbar";
import ThemeShowcaseSection from "@/components/pages/home/ThemeSection";
import Footer from "@/components/pages/home/Footer";
import SectionHeader from "@/components/pages/home/SectionHeader";

// ─── useInView hook (replaces AOS for reliability) ───────────────────────────
function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px", ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, inView];
}

// ─── Reveal wrapper ───────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = "", from = "bottom" }) {
  const [ref, inView] = useInView();

  const transforms = {
    bottom: "translateY(32px)",
    left: "translateX(-32px)",
    right: "translateX(32px)",
    scale: "scale(0.92)",
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "none" : transforms[from],
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s cubic-bezier(0.25,0.1,0.25,1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#070711] via-[#0d0d1a] to-[#090913] antialiased">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0
          bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)]
          bg-[size:80px_80px]
          [mask-image:radial-gradient(ellipse_at_50%_50%,black_20%,transparent_80%)]"
      />
      <div className="relative z-10">
        <Navbar />
        <FitnessHero />
        <StatsBar />
        <ThemeShowcaseSection />
        <HowItWork />
        <RoleTabsDemo />
        <Steps />
        <PricingPlans />
        <Testimonials />
        <FAQs />
        <ContactUs />
        <Footer />
      </div>
    </div>
  );
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ target, duration = 1800 }) {
  const [display, setDisplay] = useState("0");
  const [ref, inView] = useInView();
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;

    // Parse number + suffix (e.g. "500+" → 500, "+")
    const raw = String(target);
    const suffix = raw.replace(/[\d.]/g, "");
    const num = parseFloat(raw.replace(/[^\d.]/g, ""));
    if (isNaN(num)) { setDisplay(raw); return; }

    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const val = num * ease;
      setDisplay(
        (val >= 1000 ? Math.round(val).toLocaleString() : val % 1 === 0 || p < 1 ? Math.round(val).toString() : val.toFixed(1)) + suffix
      );
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);

  return <span ref={ref}>{display}</span>;
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar() {
  const t = useTranslations("home.hero");

  const stats = [
    {
      icon: Trophy,
      value: t("stats.coaches.value"),
      label: t("stats.coaches.label"),
      accent: "from-[var(--color-primary-400)] to-[var(--color-primary-600)]",
      glow: "rgba(99,102,241,0.35)",
    },
    {
      icon: Target,
      value: t("stats.members.value"),
      label: t("stats.members.label"),
      accent: "from-[var(--color-secondary-400)] to-[var(--color-secondary-600)]",
      glow: "rgba(168,85,247,0.35)",
    },
    {
      icon: TrendingUp,
      value: t("stats.programs.value"),
      label: t("stats.programs.label"),
      accent: "from-[var(--color-primary-500)] to-[var(--color-secondary-500)]",
      glow: "rgba(139,92,246,0.35)",
    },
    {
      icon: Users,
      value: t("stats.roles.value"),
      label: t("stats.roles.label"),
      accent: "from-[var(--color-secondary-500)] to-[var(--color-primary-400)]",
      glow: "rgba(99,102,241,0.35)",
    },
  ];

  return (
    <section id="stats-bar" className="relative overflow-hidden py-14 sm:py-20 md:py-24">
      {/* Ambient center glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center"
      >
        <div className="h-48 w-[800px] rounded-full bg-[radial-gradient(ellipse,rgba(99,102,241,0.1),transparent_65%)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-16">

        {/* ── Desktop layout: horizontal strip ── */}
        <div className="hidden sm:block">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-md">
              {/* Shimmer line top */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-primary-400)]/50 to-transparent"
              />

              <div className="grid grid-cols-4 divide-x divide-white/[0.06]">
                {stats.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <Reveal key={i} delay={i * 90} className="group relative overflow-hidden">
                      <div className="flex flex-col items-center gap-3 px-6 py-10 text-center xl:px-10">
                        {/* Hover glow bg */}
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                          style={{
                            background: `radial-gradient(ellipse at center, ${stat.glow.replace("0.35", "0.07")}, transparent 70%)`,
                          }}
                        />

                        {/* Icon */}
                        <div
                          className={`relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.accent} shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6`}
                          style={{ boxShadow: `0 6px 20px ${stat.glow}` }}
                        >
                          <Icon className="h-5 w-5 text-white" aria-hidden="true" />
                          {/* Inner shine */}
                          <div aria-hidden="true" className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/20 to-transparent" />
                        </div>

                        {/* Value */}
                        <div className="bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] bg-clip-text text-4xl font-black leading-none tracking-tight text-transparent xl:text-5xl">
                          <AnimatedNumber target={stat.value} />
                        </div>

                        {/* Label */}
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/35 transition-colors duration-300 group-hover:text-white/60">
                          {stat.label}
                        </p>

                        {/* Bottom hover bar */}
                        <div
                          aria-hidden="true"
                          className={`absolute bottom-0 left-0 right-0 h-[2px] origin-center scale-x-0 rounded-full bg-gradient-to-r ${stat.accent} transition-transform duration-500 group-hover:scale-x-100`}
                        />
                      </div>
                    </Reveal>
                  );
                })}
              </div>

              {/* Shimmer line bottom */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--color-secondary-400)]/30 to-transparent"
              />
            </div>
          </Reveal>
        </div>

        {/* ── Mobile layout: hidden (as requested) ── */}
        {/* Stats are intentionally hidden on mobile */}
      </div>
    </section>
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────
function Steps() {
  const [activeStep, setActiveStep] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const t = useTranslations("home.steps");

  const steps = [
    { id: 1, icon: ClipboardCheck, label: `${t("step")} 01`, title: t("steps.intake.title"), desc: t("steps.intake.description") },
    { id: 2, icon: Lightbulb, label: `${t("step")} 02`, title: t("steps.review.title"), desc: t("steps.review.description") },
    { id: 3, icon: PenTool, label: `${t("step")} 03`, title: t("steps.account.title"), desc: t("steps.account.description") },
    { id: 4, icon: Code, label: `${t("step")} 04`, title: t("steps.plans.title"), desc: t("steps.plans.description") },
    { id: 5, icon: Search, label: `${t("step")} 05`, title: t("steps.assignment.title"), desc: t("steps.assignment.description") },
    { id: 6, icon: Settings, label: `${t("step")} 06`, title: t("steps.followup.title"), desc: t("steps.followup.description") },
  ];

  const toggle = (id) =>
    setCompletedSteps((p) => p.includes(id) ? p.filter((s) => s !== id) : [...p, id]);

  const progress = (completedSteps.length / steps.length) * 100;

  return (
    <section
      id="steps"
      className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-14 sm:py-20 md:py-28"
    >
      {/* Background glows */}
      <div aria-hidden="true" className="pointer-events-none absolute right-6 top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,var(--color-primary-500)_0%,transparent_70%)] opacity-20 blur-3xl sm:right-10 sm:h-64 sm:w-64 md:right-20 md:h-96 md:w-96 animate-[pulseGlow_7s_ease-in-out_infinite]" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-20 left-6 h-48 w-48 rounded-full bg-[radial-gradient(circle,var(--color-secondary-500)_0%,transparent_70%)] opacity-20 blur-3xl sm:left-10 sm:h-64 sm:w-64 md:left-20 md:h-96 md:w-96 animate-[pulseGlow_9s_ease-in-out_infinite_2s]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]" />

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-16">
        <SectionHeader id="steps-heading" badge={t("badge")} title={t("title")} subtitle={t("description")} />

        {/* Progress bar */}
        <Reveal delay={100} className="mx-auto mb-10 w-full max-w-xs sm:max-w-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-white/40">{t("progress")}</span>
            <span className="text-xs font-bold text-[var(--color-primary-400)]">{completedSteps.length}/{steps.length}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="theme-gradient-bg h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </Reveal>

        {/* Steps grid */}
        <div id="steps-grid" className="relative">
          {/* Connector line — desktop only */}
          <div aria-hidden="true" className="absolute left-[calc(1/12*100%)] right-[calc(1/12*100%)] top-[52px] hidden h-px border-t-2 border-dashed border-white/[0.08] lg:block" />
          <div
            aria-hidden="true"
            className="theme-gradient-bg absolute left-[calc(1/12*100%)] top-[52px] hidden h-[2px] lg:block transition-all duration-500 ease-out"
            style={{ width: `${progress * 0.833}%` }}
          />

          <div className="overflow-x-auto pb-4 [-webkit-overflow-scrolling:touch] lg:overflow-visible lg:pb-0">
            <div className="flex w-max gap-4 px-1 sm:gap-5 sm:px-2 lg:grid lg:w-auto lg:grid-cols-6 lg:gap-3 lg:px-0">
              {steps.map((step, i) => {
                const Icon = step.icon;
                const done = completedSteps.includes(step.id);
                const isActive = activeStep === step.id;

                return (
                  <Reveal
                    key={step.id}
                    delay={i * 70}
                    className="flex w-36 cursor-pointer flex-col items-center text-center sm:w-40 lg:w-auto"
                  >
                    <div
                      id={`step-${step.id}`}
                      role="button"
                      tabIndex={0}
                      aria-pressed={done}
                      aria-label={`${step.label}: ${step.title}${done ? " — completed" : ""}`}
                      className="group flex w-full flex-col items-center text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-lg transition-transform duration-200 hover:-translate-y-1.5"
                      onMouseEnter={() => setActiveStep(step.id)}
                      onMouseLeave={() => setActiveStep(null)}
                      onClick={() => toggle(step.id)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle(step.id)}
                    >
                      {/* Step label */}
                      <div className={[
                        "mb-2 text-[10px] font-bold tracking-[0.2em] transition-colors duration-200",
                        done ? "text-[var(--color-primary-400)]" : isActive ? "text-[var(--color-primary-300)]" : "text-white/25",
                      ].join(" ")}>
                        {step.label}
                      </div>

                      {/* Circle icon */}
                      <div className="relative mb-3">
                        <div className={[
                          "flex h-[76px] w-[76px] items-center justify-center rounded-full border-2 border-dashed transition-all duration-300 sm:h-[88px] sm:w-[88px]",
                          done ? "border-[var(--color-primary-400)]/60" : isActive ? "border-[var(--color-primary-400)]/40" : "border-white/[0.12]",
                        ].join(" ")}>
                          <svg aria-hidden="true" className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 88 88">
                            <circle
                              cx="44" cy="44" r="40"
                              fill="none"
                              stroke="var(--color-primary-500)"
                              strokeWidth="2"
                              strokeDasharray="251"
                              strokeLinecap="round"
                              className="transition-all duration-700 ease-out"
                              style={{ strokeDashoffset: done ? 0 : 251 - (251 * step.id) / 6 }}
                            />
                          </svg>
                          <div className={[
                            "relative z-10 flex h-[52px] w-[52px] items-center justify-center rounded-full border transition-all duration-300 sm:h-[60px] sm:w-[60px]",
                            done
                              ? "theme-gradient-bg border-[var(--color-primary-400)]/40 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                              : "border-slate-600/50 bg-slate-800/60 backdrop-blur-sm",
                          ].join(" ")}>
                            {done ? (
                              <div className="flex items-center justify-center" style={{ animation: "scaleIn 0.3s ease-out" }}>
                                <CheckCircle2 className="h-6 w-6 text-white sm:h-7 sm:w-7" aria-hidden="true" />
                              </div>
                            ) : (
                              <Icon
                                className={["h-5 w-5 transition-colors duration-200 sm:h-6 sm:w-6", isActive ? "text-[var(--color-primary-300)]" : "text-white/40"].join(" ")}
                                strokeWidth={1.5}
                                aria-hidden="true"
                              />
                            )}
                          </div>
                        </div>

                        <div
                          aria-hidden="true"
                          className={[
                            "absolute inset-0 -z-10 rounded-full bg-[var(--color-primary-500)]/20 blur-2xl transition-all duration-300",
                            isActive || done ? "scale-[1.4] opacity-100" : "scale-100 opacity-0",
                          ].join(" ")}
                        />

                        {done && (
                          <div aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 lg:hidden" style={{ animation: "scaleIn 0.3s ease-out" }}>
                            <Check className="h-3 w-3 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      <h3 className={[
                        "mb-1 px-1 text-[13px] font-bold leading-tight transition-colors duration-200 sm:text-sm",
                        done
                          ? "bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] bg-clip-text text-transparent"
                          : isActive ? "text-white" : "text-white/60",
                      ].join(" ")}>
                        {step.title}
                      </h3>

                      <p className="hidden px-1 text-[11px] leading-relaxed text-white/35 transition-colors group-hover:text-white/50 lg:block">
                        {step.desc}
                      </p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.28; transform: scale(1.15); }
        }
        @keyframes scaleIn {
          from { transform: scale(0) rotate(-90deg); opacity: 0; }
          to { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </section>
  );
}

// ─── Pricing Plans ────────────────────────────────────────────────────────────
function PricingPlans() {
  const [cycle, setCycle] = useState("month");
  const t = useTranslations("home.pricing");

  const cycles = [
    { id: "month", label: t("cycles.month"), discount: null },
    { id: "6months", label: t("cycles.6months"), discount: "15%" },
    { id: "year", label: t("cycles.year"), discount: "30%" },
  ];

  const plans = [
    {
      id: "starter",
      name: t("plans.starter.name"),
      tagline: t("plans.starter.tagline"),
      icon: Zap,
      popular: false,
      pricing: { month: 29, "6months": 24, year: 20 },
      features: Array.from({ length: 6 }, (_, i) => t(`plans.starter.features.${i}`)),
    },
    {
      id: "professional",
      name: t("plans.professional.name"),
      tagline: t("plans.professional.tagline"),
      icon: Crown,
      popular: true,
      pricing: { month: 79, "6months": 67, year: 55 },
      features: Array.from({ length: 8 }, (_, i) => t(`plans.professional.features.${i}`)),
    },
    {
      id: "enterprise",
      name: t("plans.enterprise.name"),
      tagline: t("plans.enterprise.tagline"),
      icon: Rocket,
      popular: false,
      pricing: { month: 199, "6months": 169, year: 139 },
      features: Array.from({ length: 10 }, (_, i) => t(`plans.enterprise.features.${i}`)),
    },
  ];

  return (
    <section id="pricing" className="relative overflow-hidden py-14 sm:py-20 md:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute right-6 top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,var(--color-primary-500),transparent)] opacity-20 blur-3xl sm:right-10 sm:h-72 sm:w-72 lg:h-[400px] lg:w-[400px] animate-[pulseGlow_8s_ease-in-out_infinite]" />

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-16">
        <SectionHeader id="pricing-heading" badge={t("badge")} title={t("title")} highlight="Pro" subtitle={t("description")} />

        {/* Billing cycle toggle */}
        <Reveal delay={100} className="mb-10 flex justify-center sm:mb-14">
          <div
            id="pricing-toggle"
            role="group"
            aria-label="Billing cycle"
            className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] p-1.5 shadow-2xl backdrop-blur-xl"
          >
            {cycles.map((c) => {
              const active = cycle === c.id;
              return (
                <button
                  key={c.id}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setCycle(c.id)}
                  className={[
                    "relative rounded-[10px] px-4 py-2.5 text-[13px] font-bold transition-all duration-200 sm:px-6 sm:py-3 sm:text-sm",
                    active
                      ? "theme-gradient-bg text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                      : "text-white/40 hover:text-white/70",
                  ].join(" ")}
                >
                  <span className="relative z-10 flex flex-col items-center gap-0.5">
                    <span>{c.label}</span>
                    {c.discount && (
                      <span className="text-[10px] font-semibold text-emerald-400">
                        {t("save")} {c.discount}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* Plan cards */}
        <div
          id="pricing-cards"
          className="mx-auto grid max-w-sm grid-cols-1 gap-4 sm:max-w-none sm:gap-5 md:grid-cols-3 md:max-w-5xl"
        >
          {plans.map((plan, i) => (
            <PricingCard key={`${plan.id}-${cycle}`} plan={plan} cycle={cycle} index={i} t={t} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.28; transform: scale(1.15); }
        }
      `}</style>
    </section>
  );
}

// ─── Pricing Card ─────────────────────────────────────────────────────────────
function PricingCard({ plan, cycle, index, t }) {
  const Icon = plan.icon;
  const price = plan.pricing[cycle];
  const total =
    cycle === "6months" ? price * 6
      : cycle === "year" ? price * 12
        : price;

  return (
    <Reveal delay={index * 100} className={`group relative ${plan.popular ? "md:-mb-4 md:-mt-4" : ""}`}>
      <article
        id={`pricing-${plan.id}`}
        aria-label={`${plan.name} plan`}
        className="relative h-full transition-transform duration-300 hover:-translate-y-2"
      >
        {/* Popular badge */}
        {plan.popular && (
          <div className="theme-gradient-bg absolute -top-3.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 shadow-lg">
            <Star className="h-3.5 w-3.5 shrink-0 fill-white text-white" aria-hidden="true" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-white">{t("mostPopular")}</span>
          </div>
        )}

        <div className={[
          "relative flex h-full flex-col overflow-hidden rounded-xl border p-5 transition-all duration-300 sm:p-7",
          plan.popular
            ? "theme-gradient-bg border-[var(--color-primary-400)]/30 shadow-[0_20px_60px_rgba(99,102,241,0.3)]"
            : "border-white/[0.08] bg-slate-800/50 backdrop-blur-xl hover:border-[var(--color-primary-500)]/30 hover:shadow-[0_12px_40px_rgba(99,102,241,0.15)]",
        ].join(" ")}>
          {plan.popular && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0%,transparent_60%)]" />
          )}

          {/* Header */}
          <div className="mb-5 flex items-start gap-3 sm:gap-4">
            <div className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 sm:h-12 sm:w-12",
              plan.popular ? "bg-white/20" : "theme-gradient-bg",
            ].join(" ")}>
              <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-black leading-tight text-white sm:text-xl">{plan.name}</h3>
              <p className={["mt-0.5 text-xs leading-snug", plan.popular ? "text-white/70" : "text-white/40"].join(" ")}>{plan.tagline}</p>
            </div>
          </div>

          {/* Price */}
          <div className="mb-5 border-b border-white/[0.1] pb-5">
            <div className="flex flex-wrap items-baseline gap-1">
              <span className={[
                "text-4xl font-black leading-none sm:text-5xl",
                plan.popular
                  ? "text-white"
                  : "bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] bg-clip-text text-transparent",
              ].join(" ")}>
                ${price}
              </span>
              <span className={["text-sm", plan.popular ? "text-white/60" : "text-white/40"].join(" ")}>
                /{t("perMonth")}
              </span>
            </div>
            {cycle !== "month" && (
              <p className={["mt-1.5 text-xs", plan.popular ? "text-white/55" : "text-white/35"].join(" ")}>
                ${total} {cycle === "6months" ? t("per6Months") : t("perYear")}
              </p>
            )}
          </div>

          {/* CTA */}
          <button className={[
            "mb-6 w-full rounded-lg border py-3 text-sm font-bold transition-all duration-200 active:scale-[0.98] sm:py-3.5",
            plan.popular
              ? "border-transparent bg-white text-[var(--color-primary-700)] hover:bg-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
              : "theme-gradient-bg border-transparent text-white shadow-[0_4px_16px_rgba(99,102,241,0.25)] hover:shadow-[0_6px_24px_rgba(99,102,241,0.4)]",
          ].join(" ")}>
            {t("getStarted")}
          </button>

          {/* Features */}
          <div className="flex-1">
            <p className={["mb-3 text-[10px] font-bold uppercase tracking-[0.14em]", plan.popular ? "text-white/50" : "text-white/30"].join(" ")}>
              {t("whatsIncluded")}
            </p>
            <ul className="space-y-2.5 sm:space-y-3">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <div aria-hidden="true" className={["mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full", plan.popular ? "bg-white/25" : "theme-gradient-bg"].join(" ")}>
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                  </div>
                  <span className={["text-sm leading-snug", plan.popular ? "text-white/80" : "text-white/55"].join(" ")}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom accent bar on non-popular */}
          {!plan.popular && (
            <div
              aria-hidden="true"
              className="theme-gradient-bg absolute bottom-0 left-0 right-0 h-[3px] origin-left scale-x-0 rounded-full transition-transform duration-700 group-hover:scale-x-100"
            />
          )}
        </div>
      </article>
    </Reveal>
  );
}