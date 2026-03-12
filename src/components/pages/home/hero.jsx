"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  ImageIcon,
  Video,
  Plus,
  Minus,
  Check,
  Play,
  Zap,
  User,
  ArrowRight,
  Timer,
} from "lucide-react";

// ─── Status Bar ───────────────────────────────────────────────────────────────
function StatusBar() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setTime(
        `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`
      );
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative flex h-11 shrink-0 items-center justify-between bg-[#f5f5f7] px-[22px]">
      <span className="text-[12px] font-bold tracking-tight text-[#1a1a1a]">{time}</span>
      <div className="absolute left-1/2 top-[10px] h-[30px] w-[120px] -translate-x-1/2 rounded-[20px] bg-black" />
      <div className="flex items-center gap-[5px]">
        <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={i * 4} y={12 - (3 + i * 3)} width={3} height={3 + i * 3} rx={0.8} fill={i < 3 ? "#1a1a1a" : "#c7c7cc"} />
          ))}
        </svg>
        <svg width="14" height="11" viewBox="0 0 14 11" aria-hidden="true">
          <circle cx="7" cy="9.5" r="1.5" fill="#1a1a1a" />
          <path d="M4.5 7a3.5 3.5 0 015 0" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M2 4.5a6.5 6.5 0 0110 0" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M0 2a9 9 0 0114 0" stroke="#c7c7cc" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        </svg>
        <svg width="24" height="11" viewBox="0 0 24 11" aria-hidden="true">
          <rect x="0.5" y="0.5" width="20" height="10" rx="3" stroke="#1a1a1a" strokeOpacity="0.35" fill="none" />
          <rect x="2" y="2" width="14" height="7" rx="1.5" fill="#1a1a1a" />
          <path d="M22 3.5v4a2 2 0 000-4z" fill="#1a1a1a" fillOpacity="0.4" />
        </svg>
      </div>
    </div>
  );
}

// ─── Home Indicator ───────────────────────────────────────────────────────────
function HomeIndicator() {
  return (
    <div className="flex h-[30px] shrink-0 items-center justify-center bg-[#f5f5f7]">
      <div className="h-1 w-[120px] rounded-full bg-black opacity-[0.18]" />
    </div>
  );
}

// ─── IPhone Mockup ────────────────────────────────────────────────────────────
function IPhoneMockup({ children }) {
  return (
    <div id="iphone-mockup" className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px]">
      <div className="rounded-[44px] bg-gradient-to-br from-[#2a2a2c] via-[#1a1a1c] to-[#0f0f10] p-[9px] shadow-[0_0_0_0.5px_rgba(255,255,255,0.08),0_32px_80px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.4)]">
        {/* Side buttons */}
        <div className="absolute -left-[3px] top-[100px] h-7 w-[3px] rounded-l-sm bg-gradient-to-b from-[#333] to-[#222]" />
        <div className="absolute -left-[3px] top-[140px] h-11 w-[3px] rounded-l-sm bg-gradient-to-b from-[#333] to-[#222]" />
        <div className="absolute -left-[3px] top-[196px] h-11 w-[3px] rounded-l-sm bg-gradient-to-b from-[#333] to-[#222]" />
        <div className="absolute -right-[3px] top-[138px] h-16 w-[3px] rounded-r-sm bg-gradient-to-b from-[#333] to-[#222]" />
        <div className="flex h-[560px] flex-col overflow-hidden rounded-[36px] bg-[#f5f5f7] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.1)] sm:h-[620px]">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── App Header ───────────────────────────────────────────────────────────────
function AppHeader({ locale }) {
  const t = useTranslations("mobile.exercise");
  const isRTL = locale === "ar";
  const tabs = [t("tabs.exercises"), t("tabs.reps"), t("tabs.cardio")];
  const [active, setActive] = useState(1);

  return (
    <div id="app-header" dir={isRTL ? "rtl" : "ltr"} className="theme-gradient-bg shrink-0 px-4 pb-4 pt-[14px]">
      <p className="mb-[10px] text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
        {t("title")}
      </p>
      <div role="tablist" aria-label={t("title")} className="flex gap-1.5 rounded-[14px] bg-black/20 p-1">
        {tabs.map((tab, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={[
              "flex-1 min-w-0 cursor-pointer rounded-[10px] py-2 text-[11px] font-bold tracking-[0.02em] transition-all duration-200 truncate px-1",
              active === i
                ? "bg-white text-[var(--color-primary-600)] shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
                : "bg-transparent text-white/70",
            ].join(" ")}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Counter ─────────────────────────────────────────────────────────────────
function Counter({ value, onDec, onInc, unit = "" }) {
  return (
    <div className="flex items-center justify-center gap-1 rounded-[10px] bg-[#f0f0f2] px-1 py-1">
      <button
        onClick={onDec}
        aria-label="Decrease"
        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition-transform active:scale-90"
      >
        <Minus size={11} className="text-[#555]" />
      </button>
      <span className="min-w-[28px] text-center text-[12px] font-extrabold text-[#1a1a1a] tabular-nums">
        {value}{unit}
      </span>
      <button
        onClick={onInc}
        aria-label="Increase"
        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition-transform active:scale-90"
      >
        <Plus size={11} className="text-[#555]" />
      </button>
    </div>
  );
}

// ─── Exercise Card ────────────────────────────────────────────────────────────
function ExerciseCard({ locale }) {
  const t = useTranslations("mobile.exercise");
  const isRTL = locale === "ar";

  const [sets, setSets] = useState([
    { done: false, weight: 60, reps: 8 },
    { done: true, weight: 70, reps: 6 },
    { done: false, weight: 75, reps: 5 },
  ]);
  const [restTime, setRestTime] = useState(60);

  const toggle = (i) => setSets((p) => p.map((s, idx) => (idx === i ? { ...s, done: !s.done } : s)));
  const update = (i, f, v) => setSets((p) => p.map((s, idx) => (idx === i ? { ...s, [f]: v } : s)));

  return (
    <div id="exercise-card" className="overflow-hidden bg-white">
      {/* Exercise banner */}
      <div className="relative flex h-[120px] items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--color-primary-50)] to-[#ede9fe] sm:h-[140px]">
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full opacity-[0.06]" viewBox="0 0 200 160">
          {[...Array(8)].map((_, i) => (
            <circle key={i} cx={i * 30} cy={80} r={40 + i * 5} fill="none" stroke="var(--color-primary-600)" strokeWidth="1" />
          ))}
        </svg>
        <svg width="110" height="74" viewBox="0 0 120 80" fill="none" className="relative z-[1]" aria-hidden="true">
          <rect x="20" y="36" width="80" height="8" rx="4" fill="var(--color-primary-400)" opacity="0.4" />
          <rect x="8" y="24" width="16" height="32" rx="6" fill="var(--color-primary-500)" />
          <rect x="4" y="30" width="8" height="20" rx="4" fill="var(--color-primary-700)" />
          <rect x="96" y="24" width="16" height="32" rx="6" fill="var(--color-primary-500)" />
          <rect x="108" y="30" width="8" height="20" rx="4" fill="var(--color-primary-700)" />
          <rect x="52" y="32" width="16" height="16" rx="3" fill="var(--color-primary-600)" />
        </svg>
        <div dir={isRTL ? "rtl" : "ltr"} className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/95 to-transparent px-3 pb-2 pt-5">
          <p className="text-[14px] font-extrabold leading-tight tracking-tight text-[#1a1a1a]">{t("exercise.name")}</p>
          <p className="text-[11px] font-semibold text-[var(--color-primary-500)]">{t("exercise.target")}</p>
        </div>
        <div className={`absolute top-[10px] flex gap-1.5 ${isRTL ? "left-[10px]" : "right-[10px]"}`}>
          {[ImageIcon, Video].map((Icon, i) => (
            <button
              key={i}
              aria-label={i === 0 ? "View image" : "Watch video"}
              className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.12)] backdrop-blur-md transition-transform active:scale-90"
            >
              <Icon size={13} className="text-[var(--color-primary-600)]" />
            </button>
          ))}
        </div>
      </div>

      {/* Exercise controls */}
      <div dir={isRTL ? "rtl" : "ltr"} className="p-3">
        {/* Action row */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <button className="theme-gradient-bg flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-bold text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition-transform active:scale-95">
            <Play size={11} fill="white" />
            {t("start")}
          </button>
          <div className="flex items-center gap-1 rounded-lg bg-[#f0f0f2] px-2 py-1.5">
            <Timer size={12} className="text-[#888] shrink-0" />
            <button onClick={() => setRestTime((r) => Math.max(15, r - 15))} aria-label="Decrease rest time" className="flex h-[20px] w-[20px] items-center justify-center rounded-lg bg-white">
              <Minus size={10} className="text-[#555]" />
            </button>
            <span className="min-w-[34px] text-center text-[13px] font-extrabold text-[#1a1a1a] tabular-nums">
              {Math.floor(restTime / 60)}:{String(restTime % 60).padStart(2, "0")}
            </span>
            <button onClick={() => setRestTime((r) => r + 15)} aria-label="Increase rest time" className="flex h-[20px] w-[20px] items-center justify-center rounded-lg bg-white">
              <Plus size={10} className="text-[#555]" />
            </button>
          </div>
        </div>

        {/* Sets table */}
        <div id="sets-table" className="mb-3 overflow-hidden rounded-lg border border-black/5 bg-[#f8f8fa]">
          <div className="grid grid-cols-[32px_1fr_1fr] border-b border-black/[0.06] bg-[#f0f0f2] px-2 py-2">
            {[t("table.done"), t("table.weight"), t("table.reps")].map((h, i) => (
              <span key={i} className="text-center text-[9px] font-bold uppercase tracking-[0.08em] text-[#999]">{h}</span>
            ))}
          </div>
          {sets.map((set, i) => (
            <div
              key={i}
              className={[
                "grid grid-cols-[32px_1fr_1fr] items-center px-2 py-2 transition-colors duration-200",
                i < sets.length - 1 ? "border-b border-black/[0.04]" : "",
                set.done ? "bg-[var(--color-primary-50)]" : "bg-transparent",
              ].join(" ")}
            >
              <div className="flex justify-center">
                <button
                  onClick={() => toggle(i)}
                  aria-label={set.done ? "Mark incomplete" : "Mark complete"}
                  aria-pressed={set.done}
                  className={[
                    "flex h-5 w-5 items-center justify-center rounded-[6px] transition-all duration-200",
                    set.done ? "theme-gradient-bg shadow-[0_2px_8px_rgba(99,102,241,0.35)]" : "bg-[#e0e0e6]",
                  ].join(" ")}
                >
                  {set.done && <Check size={10} color="#fff" strokeWidth={3} />}
                </button>
              </div>
              <Counter value={set.weight} unit={locale === "ar" ? " كجم" : " kg"} onDec={() => update(i, "weight", Math.max(0, set.weight - 5))} onInc={() => update(i, "weight", set.weight + 5)} />
              <Counter value={set.reps} onDec={() => update(i, "reps", Math.max(0, set.reps - 1))} onInc={() => update(i, "reps", set.reps + 1)} />
            </div>
          ))}
        </div>

        {/* Bottom buttons */}
        <div className="flex gap-2">
          <button className="theme-gradient-bg flex-1 min-w-0 rounded-lg py-[9px] text-[12px] font-bold text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition-transform active:scale-[0.98]">
            {t("buttons.addSet")}
          </button>
          <button className="shrink-0 rounded-lg border border-[#e0e0e6] bg-white px-3 py-[9px] text-[12px] font-bold text-[#666] transition-transform active:scale-[0.98]">
            {t("buttons.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Phone Showcase ───────────────────────────────────────────────────────────
function PhoneShowcase({ locale }) {
  return (
    <div
      id="phone-showcase"
      className="relative w-full px-2 py-5 sm:px-6"
      data-aos="fade-up"
      data-aos-duration="900"
      data-aos-easing="ease-out-cubic"
    >
      {/* Radial glow */}
      <div
        aria-hidden="true"
        className="absolute -inset-5 z-0 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.2),transparent_70%)] blur-[32px] pointer-events-none"
      />
      {/* Orbiting rings — desktop only */}
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 hidden h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(99,102,241,0.15)] animate-[spin_22s_linear_infinite] lg:block" />
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 hidden h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(139,92,246,0.1)] animate-[spin_28s_linear_infinite_reverse] lg:block" />
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 hidden h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(168,85,247,0.07)] animate-[spin_35s_linear_infinite] lg:block" />

      <div className="relative z-[1] animate-[float_6s_ease-in-out_infinite]">
        <IPhoneMockup>
          <StatusBar />
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <AppHeader locale={locale} />
            <ExerciseCard locale={locale} />
          </div>
          <HomeIndicator />
        </IPhoneMockup>
      </div>
    </div>
  );
}

// ─── Trust Strip ──────────────────────────────────────────────────────────────
function TrustStrip({ t }) {
  return (
    <div
      id="trust-strip"
      data-aos="fade-up"
      data-aos-duration="700"
      data-aos-delay="400"
    >
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.05] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="flex items-stretch divide-x divide-white/[0.08] rtl:divide-x-reverse">
          {/* Active users */}
          <div className="min-w-0 flex-1 px-4 py-4 sm:px-5">
            <p className="text-xl font-black leading-none tracking-tight text-white sm:text-2xl">50K+</p>
            <p className="mt-1.5 text-[10px] font-medium leading-snug text-white/45 sm:text-[11px]">{t("trust.activeUsers")}</p>
          </div>

          {/* Rating */}
          <div className="min-w-0 flex-1 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-1.5">
              <p className="text-xl font-black leading-none tracking-tight text-white sm:text-2xl">4.9</p>
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="-mt-0.5 shrink-0">
                <path fill="#fbbf24" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <p className="mt-1.5 text-[10px] font-medium leading-snug text-white/45 sm:text-[11px]">{t("trust.rating")}</p>
          </div>

          {/* Avatar stack */}
          <div className="shrink-0 flex items-center px-4 py-4 sm:px-5">
            <div className="flex items-center" aria-label="Active community members">
              {[
                "from-[var(--color-primary-400)] to-[var(--color-primary-600)]",
                "from-[var(--color-secondary-400)] to-[var(--color-secondary-600)]",
                "from-pink-400 to-pink-600",
                "from-blue-400 to-blue-600",
              ].map((gradient, i) => (
                <div
                  key={i}
                  style={{ zIndex: 40 - i * 10 }}
                  className={[
                    "-ml-2 first:ml-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[rgba(10,10,20,0.9)] bg-gradient-to-br",
                    gradient,
                    "rtl:ml-0 rtl:-mr-2 rtl:first:mr-0",
                  ].join(" ")}
                >
                  <User size={10} color="#fff" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Hero Heading ─────────────────────────────────────────────────────────────
function HeroHeading({ t, isRTL }) {
  return (
    <div id="hero-heading" className="mb-6 sm:mb-8">
      <h1
        data-aos="fade-up"
        data-aos-duration="700"
        data-aos-delay="50"
        className="m-0 text-center text-[clamp(38px,9vw,88px)] font-black leading-[0.92] tracking-[-0.02em] text-white ltr:lg:text-left rtl:lg:text-right"
      >
        {t("headline.transform")}
      </h1>
      <h1
        data-aos="fade-up"
        data-aos-duration="700"
        data-aos-delay="130"
        className="m-0 text-center text-[clamp(38px,9vw,88px)] font-black leading-[0.92] tracking-[-0.02em] bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] bg-clip-text text-transparent drop-shadow-[0_0_48px_rgba(99,102,241,0.5)] ltr:lg:text-left rtl:lg:text-right"
      >
        {t("headline.journey")}
      </h1>
      <h2
        data-aos="fade-up"
        data-aos-duration="700"
        data-aos-delay="200"
        className="m-0 mt-3 text-center text-[clamp(17px,4vw,44px)] font-normal leading-[1.15] tracking-[0.01em] text-white/35 ltr:lg:text-left rtl:lg:text-right"
      >
        {t("headline.withScience")}
      </h2>
    </div>
  );
}

// ─── CTA Buttons ──────────────────────────────────────────────────────────────
function CTAButtons({ t, isRTL }) {
  return (
    <div
      id="cta-buttons"
      data-aos="fade-up"
      data-aos-duration="600"
      data-aos-delay="280"
      className="mb-7 flex flex-wrap items-center gap-3 justify-center lg:justify-start"
    >
      <button className="theme-gradient-bg group relative flex items-center gap-2 overflow-hidden rounded-[14px] px-5 py-3 text-sm font-bold text-white shadow-[0_6px_20px_rgba(99,102,241,0.4)] transition-all duration-150 hover:-translate-y-px active:scale-[0.97] sm:px-7 sm:py-[14px] sm:text-[15px]">
        <span
          aria-hidden="true"
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 pointer-events-none group-hover:translate-x-full"
        />
        <Zap size={16} fill="white" className="relative z-[1] shrink-0" />
        <span className="relative z-[1]">{t("cta.getStarted")}</span>
        <ArrowRight size={15} className={`relative z-[1] shrink-0 ${isRTL ? "rotate-180" : ""}`} />
      </button>

      <button className="flex items-center gap-2 rounded-[14px] border border-white/[0.12] bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white/80 backdrop-blur-lg transition-all duration-150 hover:border-white/[0.22] hover:bg-white/[0.1] active:scale-[0.97] sm:px-6 sm:py-[14px] sm:text-[15px]">
        <Play size={14} className="shrink-0" />
        {t("cta.watchDemo")}
      </button>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function ResponsiveHero() {
  const t = useTranslations("home.hero");
  const locale = useLocale();
  const isRTL = locale === "ar";
 

  return (
    <section
      id="hero"
      dir={isRTL ? "rtl" : "ltr"}
      aria-label="Hero section"
      className="relative flex min-h-screen flex-col overflow-hidden pt-20"
    >
      {/* Background glows — will-change for GPU compositing */}
      <div
        aria-hidden="true"
        className={[
          "absolute top-[5%] z-0 h-[240px] w-[240px] rounded-full blur-[80px] pointer-events-none will-change-transform",
          "bg-[radial-gradient(circle,var(--color-primary-500)_0%,transparent_70%)]",
          "animate-[pulseGlow_7s_ease-in-out_infinite]",
          "sm:h-[400px] sm:w-[400px] lg:h-[500px] lg:w-[500px]",
          isRTL ? "left-[5%]" : "right-[5%]",
        ].join(" ")}
      />
      <div
        aria-hidden="true"
        className={[
          "absolute bottom-0 z-0 h-[200px] w-[200px] rounded-full blur-[70px] pointer-events-none will-change-transform",
          "bg-[radial-gradient(circle,var(--color-secondary-500)_0%,transparent_70%)]",
          "animate-[pulseGlow_9s_ease-in-out_infinite_2s]",
          "sm:h-[320px] sm:w-[320px] lg:h-[400px] lg:w-[400px]",
          isRTL ? "right-[10%]" : "left-[10%]",
        ].join(" ")}
      />

      {/* Main grid */}
      <div className="relative z-[1] mx-auto flex w-full max-w-[1440px] flex-1 items-center px-4 py-10 pb-16 sm:px-6 sm:pb-20 lg:px-16">
        <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16">

          {/* ── Left / Text Column ── */}
          <div id="hero-text-col" className="min-w-0 w-full">
            <HeroHeading t={t} isRTL={isRTL} />

            {/* Description */}
            <p
              data-aos="fade-up"
              data-aos-duration="600"
              data-aos-delay="240"
              className="mb-6 w-full text-[clamp(14px,1.6vw,17px)] leading-[1.8] text-white/50 text-center sm:mb-8 lg:text-left lg:max-w-[520px] rtl:lg:text-right"
            >
              {t("description")}
            </p>

            {/* Phone — visible between mobile and lg */}
            <div
              data-aos="fade-up"
              data-aos-duration="800"
              data-aos-delay="200"
              className="mb-7 block lg:hidden"
            >
              <div className="relative mx-auto max-w-[300px] sm:max-w-[380px]">
                <PhoneShowcase locale={locale} />
              </div>
            </div>

            {/* CTA buttons */}
            <CTAButtons t={t} isRTL={isRTL} />

            {/* Trust strip */}
            <TrustStrip t={t} />
          </div>

          {/* ── Right / Phone Column (desktop only) ── */}
          <div
            id="hero-phone-col"
            className="relative hidden min-h-[600px] items-center justify-center lg:flex"
          >
            <PhoneShowcase locale={locale} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.28; transform: scale(1.15); }
        }
        @keyframes spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </section>
  );
}