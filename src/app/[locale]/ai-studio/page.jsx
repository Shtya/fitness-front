"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";

// Floating particle component
function Particle({ style }) {
  return (
    <div
      className="absolute rounded-full bg-blue-400 opacity-20 animate-pulse"
      style={style}
    />
  );
}

// Animated grid lines
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={`v-${i}`}
          className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-blue-500/10 to-transparent"
          style={{ left: `${(i + 1) * 8.33}%` }}
        />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={`h-${i}`}
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/10 to-transparent"
          style={{ top: `${(i + 1) * 12.5}%` }}
        />
      ))}
    </div>
  );
}

// Pulsing rings + icon
function PulsingRings() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="absolute w-40 h-40 rounded-full border border-blue-500/10 animate-ping" style={{ animationDuration: "3s" }} />
      <div className="absolute w-32 h-32 rounded-full border border-blue-400/20 animate-ping" style={{ animationDuration: "2.5s", animationDelay: "0.5s" }} />
      <div className="absolute w-24 h-24 rounded-full border border-blue-300/30 animate-ping" style={{ animationDuration: "2s", animationDelay: "1s" }} />
      <div className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-900 border border-blue-400/40 shadow-2xl shadow-blue-500/30 flex items-center justify-center">
        <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="8" stroke="#93c5fd" strokeWidth="1.5" />
          <circle cx="20" cy="20" r="3" fill="#3b82f6" />
          <line x1="20" y1="4" x2="20" y2="11" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="20" y1="29" x2="20" y2="36" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="4" y1="20" x2="11" y2="20" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="29" y1="20" x2="36" y2="20" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="8.69" y1="8.69" x2="13.76" y2="13.76" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="26.24" y1="26.24" x2="31.31" y2="31.31" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="31.31" y1="8.69" x2="26.24" y2="13.76" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="13.76" y1="26.24" x2="8.69" y2="31.31" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="20" cy="4" r="1.5" fill="#bfdbfe" />
          <circle cx="20" cy="36" r="1.5" fill="#bfdbfe" />
          <circle cx="4" cy="20" r="1.5" fill="#bfdbfe" />
          <circle cx="36" cy="20" r="1.5" fill="#bfdbfe" />
        </svg>
      </div>
    </div>
  );
}

// Progress bar with shimmer
function ProgressBar({ value }) {
  return (
    <div className="w-full h-1.5 bg-blue-950 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400 relative overflow-hidden transition-all duration-1000 ease-out"
        style={{ width: `${value}%` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
      </div>
    </div>
  );
}

// Status badge with blinking dot
function StatusBadge({ label }) {
  const [dot, setDot] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setDot((d) => !d), 900);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/80 border border-blue-700/50 text-xs font-mono text-blue-300 tracking-widest uppercase">
      <span className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${dot ? "bg-blue-400 shadow-lg shadow-blue-400" : "bg-blue-700"}`} />
      {label}
    </div>
  );
}

// Feature card
function FeatureCard({ icon, label, desc }) {
  return (
    <div className="group p-4 rounded-xl bg-blue-950/40 border border-blue-800/40 hover:border-blue-500/50 hover:bg-blue-900/30 transition-all duration-300 text-left">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-semibold text-blue-200 mb-1">{label}</div>
      <div className="text-xs text-blue-400/70 leading-relaxed">{desc}</div>
    </div>
  );
}

// Language switcher
function LangSwitcher({ locale, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="absolute top-5 right-5 z-20 px-3 py-1.5 rounded-lg bg-blue-900/60 border border-blue-700/50 text-blue-300 text-xs font-mono hover:bg-blue-800/60 transition-all"
    >
      {locale === "en" ? "عربي" : "EN"}
    </button>
  );
}

// Feature icons and keys
const FEATURES = [
  { icon: "🧠", key: "feature_models" },
  { icon: "⚡", key: "feature_realtime" },
  { icon: "🔧", key: "feature_tools" },
  { icon: "👤", key: "feature_accounts" },
  { icon: "🏋️", key: "feature_workout" },
  { icon: "🥗", key: "feature_nutrition" },
];

// ─── Translations bundled inline (no next-intl required) ──────────────────────
const translations = {
  en: {
    badge: "Under Development",
    title: "AI Studio",
    subtitle: "We're crafting something powerful for coaches. This workspace isn't ready yet — check back soon.",
    progress_label: "Build progress",
    notify_placeholder: "your@email.com",
    notify_btn: "Notify me",
    footer: "AI Studio — Coming Soon",
    feature_models: { label: "Smart Models", desc: "Connect and run advanced AI models seamlessly." },
    feature_realtime: { label: "Real-time", desc: "Low-latency streaming responses and live feedback." },
    feature_tools: { label: "Tools", desc: "Build and test custom AI-powered workflows." },
    feature_accounts: { label: "Client Accounts", desc: "Create and manage accounts for your clients easily." },
    feature_workout: { label: "Workout Plans", desc: "Design personalized exercise plans and track progress." },
    feature_nutrition: { label: "Nutrition Plans", desc: "Build tailored meal and nutrition programs per client." },
  },
  ar: {
    badge: "قيد التطوير",
    title: "AI Studio",
    subtitle: "نبني شيئاً قوياً للمدربين. هذه المساحة لم تكتمل بعد — تابعنا قريباً.",
    progress_label: "تقدم البناء",
    notify_placeholder: "بريدك@الإلكتروني.com",
    notify_btn: "أبلغني",
    footer: "AI Studio — قريباً",
    feature_models: { label: "نماذج ذكية", desc: "ربط وتشغيل نماذج الذكاء الاصطناعي المتقدمة بسلاسة." },
    feature_realtime: { label: "آني", desc: "استجابات فورية وتغذية راجعة مباشرة بكمون منخفض." },
    feature_tools: { label: "أدوات", desc: "بناء واختبار سير عمل مدعومة بالذكاء الاصطناعي." },
    feature_accounts: { label: "حسابات العملاء", desc: "إنشاء وإدارة حسابات عملائك بسهولة تامة." },
    feature_workout: { label: "خطط التمرين", desc: "تصميم خطط تمرين مخصصة ومتابعة التقدم." },
    feature_nutrition: { label: "خطط التغذية", desc: "بناء برامج غذائية مخصصة لكل عميل." },
  },
};

export default function AIStudioComingSoon() {
  const [progress] = useState(34);
  const [locale, setLocale] = useState("en");
  const t = translations[locale];
  const isRtl = locale === "ar";

  const [particles] = useState(() =>
    Array.from({ length: 18 }).map(() => ({
      width: `${Math.random() * 6 + 2}px`,
      height: `${Math.random() * 6 + 2}px`,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 4}s`,
      animationDuration: `${Math.random() * 3 + 2}s`,
    }))
  );

  return (
    <main
      dir={isRtl ? "rtl" : "ltr"}
      className=" scale-[1.03] relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "radial-gradient(ellipse 120% 80% at 50% 0%, #0f1e3a 0%, #060d1f 60%, #020509 100%)" }}
    >
      <style>{`
        @keyframes shimmer { to { transform: translateX(200%); } }
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;800&family=Cairo:wght@400;600;800&display=swap');
        body { font-family: ${isRtl ? "'Cairo'" : "'Syne'"}, sans-serif; }
      `}</style>

      {/* Language toggle */}
      <LangSwitcher locale={locale} onToggle={() => setLocale(locale === "en" ? "ar" : "en")} />

      <GridBackground />

      {/* Glow blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-700/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-cyan-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-800/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Particles */}
      {particles.map((p, i) => (
        <Particle key={i} style={p} />
      ))}

      {/* Card */}
      <div className="relative z-10 w-full max-w-xl mx-auto px-6 py-12 flex flex-col items-center gap-8">

        <StatusBadge label={t.badge} />

        <PulsingRings />

        {/* Heading */}
        <div className="text-center space-y-3">
          <h1
            className="text-5xl font-extrabold tracking-tight bg-gradient-to-b from-white via-blue-100 to-blue-400 bg-clip-text text-transparent"
            style={{ fontFamily: isRtl ? "'Cairo', sans-serif" : "'Syne', sans-serif" }}
          >
            {t.title}
          </h1>
          <p className="text-blue-300/70 text-base leading-relaxed max-w-sm mx-auto">
            {t.subtitle}
          </p>
        </div>

        {/* Progress */}
        <div className="w-full space-y-2">
          <div className="flex justify-between items-center text-xs font-mono text-blue-500">
            <span>{t.progress_label}</span>
            <span className="text-blue-300">{progress}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-700/40 to-transparent" />

        {/* Feature cards — 3 columns × 2 rows */}
        <div className="w-full grid grid-cols-3 gap-3">
          {FEATURES.map(({ icon, key }) => (
            <FeatureCard
              key={key}
              icon={icon}
              label={t[key].label}
              desc={t[key].desc}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-700/40 to-transparent" />

        {/* Notify CTA */}
        <div className="w-full flex gap-2">
          <input
            type="email"
            placeholder={t.notify_placeholder}
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-950/60 border border-blue-700/50 text-blue-100 text-sm placeholder-blue-600 focus:outline-none focus:border-blue-400/70 transition-colors"
            dir="ltr"
          />
          <button className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-semibold transition-all duration-200 whitespace-nowrap shadow-lg shadow-blue-700/30">
            {t.notify_btn}
          </button>
        </div>

        {/* Footer */}
        <p className="text-xs text-blue-600 font-mono tracking-wide text-center">
          © {new Date().getFullYear()} {t.footer}
        </p>
      </div>
    </main>
  );
}