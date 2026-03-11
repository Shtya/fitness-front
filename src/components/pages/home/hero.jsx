"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { motion } from "framer-motion";
import {
  ImageIcon, Video, Plus, Minus, Check,
  Play, Heart, Activity, Zap, Flame, User,
  ArrowRight, Timer,
} from "lucide-react";

// ─── Framer variants ──────────────────────────────────────────────────────────
const stagger = (delay = 0) => ({
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay } },
});

// ─── IPhone Mockup ────────────────────────────────────────────────────────────
function IPhoneMockup({ children }) {
  return (
    <div className="relative mx-auto w-full max-w-[300px] sm:max-w-[320px]">
      <div className="rounded-[44px] p-[9px] bg-gradient-to-br from-[#2a2a2c] via-[#1a1a1c] to-[#0f0f10]
        shadow-[0_0_0_0.5px_rgba(255,255,255,0.08),0_32px_80px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.4)]">

        {/* Side buttons */}
        <div className="absolute -left-[3px] top-[100px] w-[3px] h-7  bg-gradient-to-b from-[#333] to-[#222] rounded-l-sm" />
        <div className="absolute -left-[3px] top-[140px] w-[3px] h-11 bg-gradient-to-b from-[#333] to-[#222] rounded-l-sm" />
        <div className="absolute -left-[3px] top-[196px] w-[3px] h-11 bg-gradient-to-b from-[#333] to-[#222] rounded-l-sm" />
        <div className="absolute -right-[3px] top-[138px] w-[3px] h-16 bg-gradient-to-b from-[#333] to-[#222] rounded-r-sm" />

        {/* Screen */}
        <div className="rounded-[36px] overflow-hidden flex flex-col h-[580px] sm:h-[640px] bg-[#f5f5f7]
          shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.1)]">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Status Bar ───────────────────────────────────────────────────────────────
function StatusBar() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setTime(`${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`);
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative flex items-center justify-between px-[22px] h-11 bg-[#f5f5f7] shrink-0">
      <span className="text-[12px] font-bold text-[#1a1a1a] tracking-tight font-body">{time}</span>
      <div className="absolute left-1/2 -translate-x-1/2 top-[10px] w-[120px] h-[30px] bg-black rounded-[20px]" />
      <div className="flex items-center gap-[5px]">
        <svg width="16" height="12" viewBox="0 0 16 12">
          {[0,1,2,3].map(i => (
            <rect key={i} x={i*4} y={12-(3+i*3)} width={3} height={3+i*3} rx={0.8}
              fill={i < 3 ? "#1a1a1a" : "#c7c7cc"} />
          ))}
        </svg>
        <svg width="14" height="11" viewBox="0 0 14 11">
          <circle cx="7" cy="9.5" r="1.5" fill="#1a1a1a"/>
          <path d="M4.5 7a3.5 3.5 0 015 0" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
          <path d="M2 4.5a6.5 6.5 0 0110 0" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
          <path d="M0 2a9 9 0 0114 0" stroke="#c7c7cc" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
        </svg>
        <svg width="24" height="11" viewBox="0 0 24 11">
          <rect x="0.5" y="0.5" width="20" height="10" rx="3" stroke="#1a1a1a" strokeOpacity="0.35" fill="none"/>
          <rect x="2" y="2" width="14" height="7" rx="1.5" fill="#1a1a1a"/>
          <path d="M22 3.5v4a2 2 0 000-4z" fill="#1a1a1a" fillOpacity="0.4"/>
        </svg>
      </div>
    </div>
  );
}

// ─── Home Indicator ───────────────────────────────────────────────────────────
function HomeIndicator() {
  return (
    <div className="h-[30px] flex items-center justify-center shrink-0 bg-[#f5f5f7]">
      <div className="w-[120px] h-1 bg-black rounded-full opacity-[0.18]" />
    </div>
  );
}

// ─── App Header ───────────────────────────────────────────────────────────────
function AppHeader({ locale }) {
  const t     = useTranslations("mobile.exercise");
  const isRTL = locale === "ar";
  const tabs  = [t("tabs.exercises"), t("tabs.reps"), t("tabs.cardio")];
  const [active, setActive] = useState(1);

  return (
    <div
      className="theme-gradient-bg px-4 pt-[14px] pb-4 shrink-0"
      style={{ direction: isRTL ? "rtl" : "ltr" }}
    >
      <p className="text-center text-white/70 text-[11px] font-semibold font-body
        tracking-[0.12em] uppercase mb-[10px]">
        {t("title")}
      </p>
      <div className="flex gap-1.5 bg-black/20 p-1 rounded-[14px]">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={[
              "flex-1 py-2 rounded-[10px] border-none cursor-pointer",
              "text-[11px] font-bold font-body tracking-[0.02em] transition-all duration-200",
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
    <div className="flex items-center justify-center gap-1 bg-[#f0f0f2] rounded-[10px] px-1.5 py-1">
      <button onClick={onDec}
        className="w-[22px] h-[22px] rounded-[7px] border-none bg-white cursor-pointer
          flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.12)]
          active:scale-90 transition-transform">
        <Minus size={11} className="text-[#555]" />
      </button>
      <span className="min-w-[32px] text-center text-[13px] font-extrabold text-[#1a1a1a] font-body">
        {value}{unit}
      </span>
      <button onClick={onInc}
        className="w-[22px] h-[22px] rounded-[7px] border-none bg-white cursor-pointer
          flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.12)]
          active:scale-90 transition-transform">
        <Plus size={11} className="text-[#555]" />
      </button>
    </div>
  );
}

// ─── Exercise Card ────────────────────────────────────────────────────────────
function ExerciseCard({ locale }) {
  const t     = useTranslations("mobile.exercise");
  const isRTL = locale === "ar";
  const [sets, setSets] = useState([
    { done: false, weight: 60, reps: 8 },
    { done: true,  weight: 70, reps: 6 },
    { done: false, weight: 75, reps: 5 },
  ]);
  const [restTime, setRestTime] = useState(60);

  const toggle = (i) => setSets(p => p.map((s, idx) => idx === i ? { ...s, done: !s.done } : s));
  const update = (i, f, v) => setSets(p => p.map((s, idx) => idx === i ? { ...s, [f]: v } : s));

  return (
    <div className="bg-white overflow-hidden">
      {/* Hero image */}
      <div className="relative h-[140px] sm:h-[160px] bg-gradient-to-br from-[#eef2ff] to-[#ede9fe]
        flex items-center justify-center overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" viewBox="0 0 200 160">
          {[...Array(8)].map((_,i) => (
            <circle key={i} cx={i*30} cy={80} r={40+i*5}
              fill="none" stroke="var(--color-primary-600)" strokeWidth="1"/>
          ))}
        </svg>
        <svg width="120" height="80" viewBox="0 0 120 80" fill="none" className="relative z-[1]">
          <rect x="20" y="36" width="80" height="8" rx="4" fill="var(--color-primary-400)" opacity="0.4"/>
          <rect x="8"  y="24" width="16" height="32" rx="6" fill="var(--color-primary-500)"/>
          <rect x="4"  y="30" width="8"  height="20" rx="4" fill="var(--color-primary-700)"/>
          <rect x="96" y="24" width="16" height="32" rx="6" fill="var(--color-primary-500)"/>
          <rect x="108" y="30" width="8" height="20" rx="4" fill="var(--color-primary-700)"/>
          <rect x="52" y="32" width="16" height="16" rx="3" fill="var(--color-primary-600)"/>
        </svg>
        {/* Name overlay */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/95 to-transparent
            pt-5 pb-2 px-[14px]"
          style={{ direction: isRTL ? "rtl" : "ltr" }}
        >
          <p className="text-[15px] font-extrabold text-[#1a1a1a] font-body tracking-tight leading-tight">
            {locale === "ar" ? "تمرين الصدر" : "Bench Press"}
          </p>
          <p className="text-[11px] font-semibold font-body text-[var(--color-primary-500)]">
            {locale === "ar" ? "عضلات الصدر" : "Chest · Triceps · Shoulders"}
          </p>
        </div>
        {/* Media buttons */}
        <div className={`absolute top-[10px] flex gap-1.5 ${isRTL ? "left-[10px]" : "right-[10px]"}`}>
          {[ImageIcon, Video].map((Icon, i) => (
            <button key={i}
              className="w-8 h-8 rounded-[10px] border-none bg-white/90 backdrop-blur-md
                flex items-center justify-center cursor-pointer
                shadow-[0_2px_8px_rgba(0,0,0,0.12)] active:scale-90 transition-transform">
              <Icon size={14} style={{ color: "var(--color-primary-600)" }} />
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-[14px]" style={{ direction: isRTL ? "rtl" : "ltr" }}>
        {/* Rest timer */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <button className="theme-gradient-bg flex items-center gap-1.5 border-none
            rounded-lg px-[14px] py-2 text-[12px] font-bold text-white cursor-pointer font-body
            shadow-[0_4px_12px_rgba(99,102,241,0.35)] active:scale-95 transition-transform">
            <Play size={12} fill="white" />
            {t("start")}
          </button>
          <div className="flex items-center gap-1.5 bg-[#f0f0f2] rounded-lg px-[10px] py-1.5">
            <Timer size={13} className="text-[#888]" />
            <button onClick={() => setRestTime(r => Math.max(15, r - 15))}
              className="border-none bg-white rounded-lg w-[22px] h-[22px] cursor-pointer
                flex items-center justify-center">
              <Minus size={11} className="text-[#555]" />
            </button>
            <span className="text-[14px] font-extrabold text-[#1a1a1a] min-w-[38px] text-center font-body">
              {Math.floor(restTime/60)}:{String(restTime%60).padStart(2,"0")}
            </span>
            <button onClick={() => setRestTime(r => r + 15)}
              className="border-none bg-white rounded-lg w-[22px] h-[22px] cursor-pointer
                flex items-center justify-center">
              <Plus size={11} className="text-[#555]" />
            </button>
          </div>
        </div>

        {/* Sets table */}
        <div className="bg-[#f8f8fa] rounded-lg overflow-hidden border border-black/5 mb-3">
          <div className="grid grid-cols-[36px_1fr_1fr] px-3 py-2 border-b border-black/[0.06] bg-[#f0f0f2]">
            {[t("table.done"), t("table.weight"), t("table.reps")].map((h, i) => (
              <span key={i}
                className="text-[10px] font-bold text-[#999] uppercase tracking-[0.08em] text-center font-body">
                {h}
              </span>
            ))}
          </div>
          {sets.map((set, i) => (
            <div key={i}
              className={[
                "grid grid-cols-[36px_1fr_1fr] px-3 py-2 items-center transition-colors duration-200",
                i < sets.length - 1 ? "border-b border-black/[0.04]" : "",
                set.done ? "bg-indigo-500/[0.04]" : "bg-transparent",
              ].join(" ")}
            >
              <div className="flex justify-center">
                <button onClick={() => toggle(i)}
                  className={[
                    "w-5 h-5 rounded-[6px] border-none cursor-pointer",
                    "flex items-center justify-center transition-all duration-200",
                    set.done
                      ? "theme-gradient-bg shadow-[0_2px_8px_rgba(99,102,241,0.4)]"
                      : "bg-[#e0e0e6]",
                  ].join(" ")}
                >
                  {set.done && <Check size={11} color="#fff" strokeWidth={3} />}
                </button>
              </div>
              <Counter value={set.weight} unit=" kg"
                onDec={() => update(i,"weight", Math.max(0, set.weight-5))}
                onInc={() => update(i,"weight", set.weight+5)} />
              <Counter value={set.reps}
                onDec={() => update(i,"reps", Math.max(0, set.reps-1))}
                onInc={() => update(i,"reps", set.reps+1)} />
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button className="flex-1 py-[10px] rounded-lg border-none theme-gradient-bg
            text-white text-[13px] font-bold font-body cursor-pointer
            shadow-[0_4px_14px_rgba(99,102,241,0.35)] active:scale-[0.98] transition-transform">
            {t("buttons.addSet")}
          </button>
          <button className="px-4 py-[10px] rounded-lg border border-[#e0e0e6] bg-white
            text-[#666] text-[13px] font-bold font-body cursor-pointer
            active:scale-[0.98] transition-transform">
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
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
      className="w-full relative px-4 sm:px-8 lg:px-10 py-5"
    >
      {/* Glow */}
      <div className="absolute -inset-5 rounded-full
        bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.25),transparent_70%)]
        blur-[32px] pointer-events-none z-0" />

      {/* Spinning rings — hidden on small screens to avoid overflow */}
      {[380,440,500].map((size, i) => (
        <div key={i} className="absolute rounded-full pointer-events-none top-1/2 left-1/2 hidden lg:block"
          style={{
            width: size, height: size,
            border: `1px solid rgba(${["99,102,241","139,92,246","168,85,247"][i]},${[0.2,0.15,0.1][i]})`,
            transform: "translate(-50%,-50%)",
            animation: `hero-spin-ring ${[22,28,35][i]}s linear infinite ${i%2===0?"":"reverse"}`,
          }} />
      ))}

      {/* Phone */}
      <div className="relative z-[1]">
        <IPhoneMockup>
          <StatusBar />
          <div className="flex-1 overflow-y-auto">
            <AppHeader locale={locale} />
            <ExerciseCard locale={locale} />
          </div>
          <HomeIndicator />
        </IPhoneMockup>
      </div>
    </motion.div>
  );
}

// ─── Trust Strip ──────────────────────────────────────────────────────────────
function TrustStrip({ t }) {
  return (
    <motion.div variants={stagger(0.55)} initial="hidden" animate="show">
      <div className="flex items-center bg-white/[0.04] border border-white/[0.08]
        rounded-lg overflow-hidden backdrop-blur-xl">
        {/* Users */}
        <div className="flex-1 px-3 sm:px-5 py-[14px]">
          <p className="text-[20px] sm:text-[22px] font-black text-white leading-none font-body tracking-tight">50K+</p>
          <p className="text-[10px] sm:text-[11px] text-white/45 font-medium font-body mt-0.5">{t("trust.activeUsers")}</p>
        </div>
        <div className="w-px h-10 bg-white/10 shrink-0" />
        {/* Rating */}
        <div className="flex-1 px-3 sm:px-5 py-[14px]">
          <div className="flex items-center gap-1">
            <p className="text-[20px] sm:text-[22px] font-black text-white leading-none font-body tracking-tight">4.9</p>
            <svg width="16" height="16" viewBox="0 0 24 24" className="-mt-0.5">
              <path fill="#fbbf24" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <p className="text-[10px] sm:text-[11px] text-white/45 font-medium font-body mt-0.5">{t("trust.rating")}</p>
        </div>
        <div className="w-px h-10 bg-white/10 shrink-0" />
        {/* Avatar stack */}
        <div className="px-3 sm:px-5 py-[14px] flex items-center">
          <div className="flex">
            {[
              "from-[var(--color-primary-400)] to-[var(--color-primary-600)]",
              "from-[var(--color-secondary-400)] to-[var(--color-secondary-600)]",
              "from-pink-400 to-pink-600",
              "from-blue-400 to-blue-600",
            ].map((grad, i) => (
              <div key={i}
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br ${grad}
                  border-2 border-[rgba(10,10,20,0.9)]
                  flex items-center justify-center ${i > 0 ? "-ml-2" : ""}`}
                style={{ zIndex: 4 - i }}
              >
                <User size={10} color="#fff" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function ResponsiveHero() {
  const t      = useTranslations("home.hero");
  const locale = useLocale();
  const isRTL  = locale === "ar";

  return (
    <>
      <style>{`
        @keyframes hero-float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-14px); }
        }
        @keyframes hero-spin-ring {
          from { transform: translate(-50%,-50%) rotate(0deg); }
          to   { transform: translate(-50%,-50%) rotate(360deg); }
        }
        @keyframes hero-pulse-dot {
          0%,100% { opacity:1; transform:scale(1); }
          50%     { opacity:0.5; transform:scale(1.5); }
        }
        .hero-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
          align-items: center;
          width: 100%;
        }
        @media (min-width: 1024px) {
          .hero-grid { grid-template-columns: 1fr 1fr; gap: 64px; }
        }
        .hero-phone-desktop { display: none; }
        @media (min-width: 1024px) {
          .hero-phone-desktop {
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
            min-height: 600px;
          }
        }
        .hero-phone-mobile { display: block; }
        @media (min-width: 1024px) {
          .hero-phone-mobile { display: none; }
        }
      `}</style>

      <section
        className="relative min-h-screen overflow-hidden flex flex-col pt-20
          "
        style={{ direction: isRTL ? "rtl" : "ltr" }}
      >
        {/* Orb 1 */}
        <motion.div
          animate={{ scale:[1,1.15,1], opacity:[0.15,0.28,0.15] }}
          transition={{ duration:7, repeat:Infinity, ease:"easeInOut" }}
          className={`absolute top-[5%] ${isRTL ? "left-[5%]" : "right-[5%]"}
            w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full pointer-events-none z-0 blur-[80px]
            bg-[radial-gradient(circle,var(--color-primary-500)_0%,transparent_70%)]`}
        />
        {/* Orb 2 */}
        <motion.div
          animate={{ scale:[1,1.2,1], opacity:[0.12,0.22,0.12] }}
          transition={{ duration:9, repeat:Infinity, ease:"easeInOut", delay:2 }}
          className={`absolute bottom-0 ${isRTL ? "right-[10%]" : "left-[10%]"}
            w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] rounded-full pointer-events-none z-0 blur-[70px]
            bg-[radial-gradient(circle,var(--color-secondary-500)_0%,transparent_70%)]`}
        />
        

        {/* ── Content ── */}
        <div className="relative z-[1] w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-16 py-8 pb-16 sm:pb-20 flex-1 flex items-center">
          <div className="hero-grid">

            {/* ─── Text column ─────────────────────────────────── */}
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.12 } } }}
              className="w-full min-w-0"
            >
              {/* Headlines */}
              <div className="mb-5 sm:mb-6">
                <motion.h1 variants={stagger(0.08)}
                  className="font-display text-[clamp(40px,10vw,96px)] leading-[0.93]
                    text-white max-md:text-center m-0 tracking-[0.01em]">
                  {t("headline.transform")}
                </motion.h1>

                <motion.h1 variants={stagger(0.16)}
                  className="font-display max-md:text-center text-[clamp(40px,10vw,96px)] leading-[0.93] m-0
                    bg-gradient-to-br from-[var(--color-primary-400)] to-[var(--color-secondary-400)]
                    bg-clip-text text-transparent
                    drop-shadow-[0_0_40px_rgba(99,102,241,0.5)]">
                  {t("headline.journey")}
                </motion.h1>

                <motion.h2 variants={stagger(0.24)}
                  className="font-display max-md:text-center text-[clamp(20px,5vw,52px)] leading-[1.1]
                    m-0 mt-1 text-white/[0.38] tracking-[0.02em] font-normal">
                  {t("headline.withScience")}
                </motion.h2>
              </div>

              {/* Description */}
              <motion.p variants={stagger(0.32)}
                className="font-body max-md:text-center text-[clamp(14px,1.8vw,18px)] text-white/50
                  leading-[1.7] m-0 mb-6 sm:mb-8 max-w-full sm:max-w-[460px]
                  overflow-hidden">
                {t("description")}
              </motion.p>

              {/* Phone — mobile only */}
              <motion.div variants={stagger(0.36)} className="hero-phone-mobile mb-7 sm:mb-9">
                <div className="max-w-[360px] sm:max-w-[500px] mx-auto relative">
                  <PhoneShowcase locale={locale} />
                </div>
              </motion.div>

              {/* CTAs */}
              <motion.div variants={stagger(0.40)} className="flex max-md:justify-center flex-wrap gap-3 mb-6 sm:mb-8">
                <button
                  className="group relative flex items-center gap-2 border-none rounded-[14px]
                    px-5 sm:px-7 py-[12px] sm:py-[14px] text-[14px] sm:text-[15px] font-bold font-body text-white cursor-pointer
                    theme-gradient-bg overflow-hidden
                    shadow-[0_4px_24px_rgba(99,102,241,0.45),inset_0_1px_0_rgba(255,255,255,0.15)]
                    hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(99,102,241,0.55)]
                    transition-all duration-150"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20
                    to-transparent -translate-x-full group-hover:translate-x-full
                    transition-transform duration-700 pointer-events-none" />
                  <Zap size={16} fill="white" className="relative z-[1]" />
                  <span className="relative z-[1]">{t("cta.getStarted")}</span>
                  <ArrowRight size={15}
                    className={`relative z-[1] ${isRTL ? "scale-x-[-1]" : ""}`} />
                </button>

                <button
                  className="flex items-center gap-2 border border-white/[0.12] rounded-[14px]
                    px-5 sm:px-6 py-[12px] sm:py-[14px] text-[14px] sm:text-[15px] font-semibold font-body text-white/80 cursor-pointer
                    bg-white/[0.06] backdrop-blur-lg
                    hover:bg-white/10 hover:border-white/[0.22]
                    transition-all duration-150"
                >
                  <Play size={15} />
                  {t("cta.watchDemo")}
                </button>
              </motion.div>

              {/* Trust */}
              <TrustStrip t={t} />
            </motion.div>

            {/* ─── Phone — desktop only ─────────────────────────── */}
            <div className="hero-phone-desktop">
              <PhoneShowcase locale={locale} />
            </div>

          </div>
        </div>
      </section>
    </>
  );
}